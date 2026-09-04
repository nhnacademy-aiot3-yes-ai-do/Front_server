import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { jsonRequest, request, unwrapApiResponse } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { formatSensorType, normalizeList, normalizeSensorUnit } from "../../utils/formatters";

const EMPTY_SENSOR = {
  deviceEui: "",
  deviceModel: "",
  deviceName: "",
  location: "",
  locationDetail: "",
};

function groupSensorTypes(sensorTypes) {
  const groups = new Map();

  sensorTypes.forEach((type) => {
    const variants = groups.get(type.type) || [];
    variants.push(type);
    groups.set(type.type, variants);
  });

  return Array.from(groups, ([type, variants]) => ({ type, variants }));
}

function preferredType(variants, environmentSettings) {
  const environmentTypeIds = new Set(environmentSettings.map((setting) => setting.sensorTypeId));

  if (variants[0]?.type === "TEMPERATURE") {
    return (
      variants.find(
        (type) =>
          normalizeSensorUnit(type.valueUnit) === "°C" && environmentTypeIds.has(type.id),
      ) ||
      variants.find((type) => normalizeSensorUnit(type.valueUnit) === "°C") ||
      variants.find((type) => environmentTypeIds.has(type.id)) ||
      variants[0]
    );
  }

  return variants.find((type) => environmentTypeIds.has(type.id)) || variants[0];
}

function convertTemperature(value, sourceUnit, targetUnit) {
  const number = Number(value);
  const source = normalizeSensorUnit(sourceUnit);
  const target = normalizeSensorUnit(targetUnit);

  if (!Number.isFinite(number) || source === target) return value;

  const converted =
    source === "°C" && target === "°F"
      ? (number * 9) / 5 + 32
      : source === "°F" && target === "°C"
        ? ((number - 32) * 5) / 9
        : number;

  return Number(converted.toFixed(2));
}

function initialSetting(type, environmentSettings, sensorTypes) {
  let recommended = environmentSettings.find((setting) => setting.sensorTypeId === type.id);
  let sourceType = type;

  if (!recommended && type.type === "TEMPERATURE") {
    recommended = environmentSettings.find((setting) => {
      const candidate = sensorTypes.find((sensorType) => sensorType.id === setting.sensorTypeId);
      if (candidate?.type !== "TEMPERATURE") return false;
      sourceType = candidate;
      return true;
    });
  }

  const converted = recommended && sourceType.id !== type.id;

  return {
    thresholdMin: converted
      ? convertTemperature(recommended.thresholdMin, sourceType.valueUnit, type.valueUnit)
      : (recommended?.thresholdMin ?? ""),
    thresholdMax: converted
      ? convertTemperature(recommended.thresholdMax, sourceType.valueUnit, type.valueUnit)
      : (recommended?.thresholdMax ?? ""),
    requiresValidation: !recommended,
    validation: recommended
      ? {
          valid: true,
          status: "approved",
          message: converted
            ? "현재 재배지의 환경 임계값을 선택한 단위로 변환해 적용합니다."
            : "현재 재배지의 환경 임계값을 적용합니다.",
        }
      : null,
  };
}

function hasValidThreshold(setting) {
  const minimumText = String(setting?.thresholdMin ?? "").trim();
  const maximumText = String(setting?.thresholdMax ?? "").trim();
  const minimum = Number(minimumText);
  const maximum = Number(maximumText);

  return (
    minimumText !== "" &&
    maximumText !== "" &&
    Number.isFinite(minimum) &&
    Number.isFinite(maximum) &&
    minimum < maximum
  );
}

export default function CultivationSensorSetupStep({
  cultivationId,
  environmentSettings,
  registeredSensors = [],
  onRegistered,
}) {
  const [sourceMode, setSourceMode] = useState("new");
  const [catalogModeInitialized, setCatalogModeInitialized] = useState(false);
  const [selectedDeviceEui, setSelectedDeviceEui] = useState(null);
  const [sensorForm, setSensorForm] = useState(EMPTY_SENSOR);
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);
  const [settings, setSettings] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [registrationWarning, setRegistrationWarning] = useState(null);
  const successNoticeRef = useRef(null);
  const sensorTypesQuery = useQuery({
    queryKey: ["sensor-types"],
    queryFn: () => request("/cultivations/sensor-types"),
    staleTime: 300_000,
  });
  const reusableSensorsQuery = useQuery({
    queryKey: ["reusable-sensors", Number(cultivationId)],
    queryFn: () =>
      request(`/cultivations/reusable-sensors?exclude-cultivation-id=${cultivationId}`),
    enabled: Number.isFinite(Number(cultivationId)),
  });

  const sensorTypes = normalizeList(sensorTypesQuery.data?.sensorTypeInfoResponses);
  const sensorTypeGroups = groupSensorTypes(sensorTypes);
  const reusableSensors = normalizeList(reusableSensorsQuery.data?.sensors);
  const registeredDeviceEuis = new Set(
    normalizeList(registeredSensors)
      .map((sensor) => String(sensor.deviceEui ?? "").trim().toUpperCase())
      .filter(Boolean),
  );
  const normalizedDeviceEui = sensorForm.deviceEui.trim().toUpperCase();
  const isDuplicateDeviceEui =
    normalizedDeviceEui !== "" && registeredDeviceEuis.has(normalizedDeviceEui);
  const selectedTypes = selectedTypeIds
    .map((id) => sensorTypes.find((type) => type.id === id))
    .filter(Boolean);
  const requiredFieldsComplete = Object.values(sensorForm).every(
    (value) => String(value ?? "").trim().length > 0,
  );
  const selectedSettingsReady =
    selectedTypes.length > 0 &&
    selectedTypes.every((type) => {
      const setting = settings[type.id];
      if (!hasValidThreshold(setting)) return false;
      if (!setting?.requiresValidation) return true;

      return ["approved", "warning", "unavailable"].includes(setting.validation?.status);
    });
  const hasSelectedExistingSensor = sourceMode !== "existing" || Boolean(selectedDeviceEui);
  const canSubmit =
    requiredFieldsComplete &&
    selectedSettingsReady &&
    hasSelectedExistingSensor &&
    !isDuplicateDeviceEui &&
    !busy;
  const showSensorForm = sourceMode === "new" || Boolean(selectedDeviceEui);

  useEffect(() => {
    if (catalogModeInitialized || reusableSensorsQuery.isLoading) return;
    if (reusableSensors.length > 0) setSourceMode("existing");
    setCatalogModeInitialized(true);
  }, [catalogModeInitialized, reusableSensors, reusableSensorsQuery.isLoading]);

  useEffect(() => {
    if (notice?.type !== "success") return;
    successNoticeRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [notice]);

  const clearSelection = (mode) => {
    setSourceMode(mode);
    setSelectedDeviceEui(null);
    setSensorForm(EMPTY_SENSOR);
    setSelectedTypeIds([]);
    setSettings({});
    setNotice(null);
    setRegistrationWarning(null);
  };

  const selectReusableSensor = (sensor) => {
    const reusableTypes = normalizeList(sensor.sensorTypes)
      .map((type) => type.sensorTypeId)
      .map((id) => sensorTypes.find((type) => type.id === id))
      .filter(Boolean);
    const selectedReusableTypes = groupSensorTypes(reusableTypes)
      .map((group) => preferredType(group.variants, environmentSettings))
      .filter(Boolean);
    const typeIds = selectedReusableTypes.map((type) => type.id);

    setSourceMode("existing");
    setSelectedDeviceEui(sensor.deviceEui);
    setSensorForm({
      deviceEui: sensor.deviceEui || "",
      deviceModel: sensor.deviceModel || "",
      deviceName: sensor.deviceName || "",
      location: sensor.location || "",
      locationDetail: sensor.locationDetail || "",
    });
    setSelectedTypeIds(typeIds);
    setSettings(
      Object.fromEntries(
        typeIds.map((id) => {
          const type = sensorTypes.find((item) => item.id === id);
          return [id, initialSetting(type, environmentSettings, sensorTypes)];
        }),
      ),
    );
    setNotice(null);
    setRegistrationWarning(null);
  };

  const updateSensorField = (field, value) => {
    setSensorForm((current) => ({ ...current, [field]: value }));
  };

  const toggleTypeGroup = (group) => {
    const groupTypeIds = new Set(group.variants.map((type) => type.id));
    const selectedType = group.variants.find((type) => selectedTypeIds.includes(type.id));

    if (selectedType) {
      setSelectedTypeIds((ids) => ids.filter((id) => !groupTypeIds.has(id)));
      setSettings((current) => {
        const next = { ...current };
        groupTypeIds.forEach((id) => delete next[id]);
        return next;
      });
      return;
    }

    const nextType = preferredType(group.variants, environmentSettings);
    setSelectedTypeIds((ids) => [...ids.filter((id) => !groupTypeIds.has(id)), nextType.id]);
    setSettings((current) => ({
      ...current,
      [nextType.id]: initialSetting(nextType, environmentSettings, sensorTypes),
    }));
  };

  const selectUnit = (group, nextType) => {
    const groupTypeIds = new Set(group.variants.map((type) => type.id));
    const currentType = group.variants.find((type) => selectedTypeIds.includes(type.id));
    if (currentType?.id === nextType.id) return;

    const currentSetting = currentType ? settings[currentType.id] : null;
    let nextSetting = initialSetting(nextType, environmentSettings, sensorTypes);

    if (currentType?.type === "TEMPERATURE" && currentSetting) {
      nextSetting = {
        ...currentSetting,
        thresholdMin: convertTemperature(
          currentSetting.thresholdMin,
          currentType.valueUnit,
          nextType.valueUnit,
        ),
        thresholdMax: convertTemperature(
          currentSetting.thresholdMax,
          currentType.valueUnit,
          nextType.valueUnit,
        ),
        validation: currentSetting.requiresValidation ? null : nextSetting.validation,
      };
    }

    setSelectedTypeIds((ids) => [...ids.filter((id) => !groupTypeIds.has(id)), nextType.id]);
    setSettings((current) => {
      const next = { ...current };
      groupTypeIds.forEach((id) => delete next[id]);
      next[nextType.id] = nextSetting;
      return next;
    });
  };

  const updateThreshold = (typeId, field, value) => {
    setSettings((current) => ({
      ...current,
      [typeId]: {
        ...current[typeId],
        [field]: value,
        validation: null,
      },
    }));
  };

  const validateThreshold = async (type) => {
    const setting = settings[type.id];
    const minimum = Number(setting?.thresholdMin);
    const maximum = Number(setting?.thresholdMax);

    if (!hasValidThreshold(setting)) {
      setSettings((current) => ({
        ...current,
        [type.id]: {
          ...current[type.id],
          validation: {
            valid: false,
            status: "invalid",
            message: "최소값은 최대값보다 작은 숫자여야 합니다.",
          },
        },
      }));
      return;
    }

    setSettings((current) => ({
      ...current,
      [type.id]: {
        ...current[type.id],
        validation: {
          valid: false,
          status: "pending",
          pending: true,
          message: "AI 검증 중...",
        },
      },
    }));

    try {
      const result = await jsonRequest(`/cultivations/${cultivationId}/sensor-validation`, "POST", {
        sensorTypeId: type.id,
        sensorTypeName: type.type,
        sensorUnit: type.valueUnit,
        userMin: minimum,
        userMax: maximum,
      }).then(unwrapApiResponse);

      const isValid = result?.isValid ?? result?.valid;

      setSettings((current) => ({
        ...current,
        [type.id]: {
          ...current[type.id],
          validation: {
            valid: isValid === true,
            status: isValid === true ? "approved" : isValid === false ? "warning" : "unavailable",
            message: result?.message || "검증 결과를 확인하지 못했습니다.",
          },
        },
      }));
    } catch (error) {
      setSettings((current) => ({
        ...current,
        [type.id]: {
          ...current[type.id],
          validation: {
            valid: false,
            status: "unavailable",
            message: error.message || "AI 검증을 완료하지 못했습니다.",
          },
        },
      }));
    }
  };

  const persistSensor = async (sensor) => {
    setRegistrationWarning(null);
    setBusy(true);
    try {
      await jsonRequest(`/cultivations/${cultivationId}/sensors`, "POST", sensor);
      setNotice({ type: "success", message: `${sensor.deviceName} 기기 등록이 완료되었습니다.` });
      setSelectedDeviceEui(null);
      setSensorForm(EMPTY_SENSOR);
      setSelectedTypeIds([]);
      setSettings({});
      onRegistered(sensor);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const registerSensor = async (event) => {
    event.preventDefault();

    if (sourceMode === "existing" && !selectedDeviceEui) {
      setNotice({ type: "error", message: "가져올 기존 센서를 선택해 주세요." });
      return;
    }
    if (selectedTypes.length === 0) {
      setNotice({ type: "error", message: "측정 타입을 하나 이상 선택해 주세요." });
      return;
    }
    if (!requiredFieldsComplete) {
      setNotice({ type: "error", message: "센서의 필수 정보를 모두 입력해 주세요." });
      return;
    }
    if (isDuplicateDeviceEui) {
      setNotice({ type: "error", message: "이 재배지에 이미 등록된 센서 고유번호입니다." });
      return;
    }

    const hasInvalidSetting = selectedTypes.some((type) => {
      const setting = settings[type.id];
      if (!hasValidThreshold(setting)) return true;
      if (!setting?.requiresValidation) return false;

      return !["approved", "warning", "unavailable"].includes(setting.validation?.status);
    });

    if (hasInvalidSetting) {
      setNotice({ type: "error", message: "선택한 모든 측정 타입의 범위를 확인해 주세요." });
      return;
    }

    const sensor = {
      ...sensorForm,
      deviceEui: sensorForm.deviceEui.trim(),
      deviceModel: sensorForm.deviceModel.trim(),
      deviceName: sensorForm.deviceName.trim(),
      location: sensorForm.location.trim(),
      locationDetail: sensorForm.locationDetail.trim(),
      sensorSettings: selectedTypes.map((type) => ({
        sensorTypeId: type.id,
        thresholdMin: Number(settings[type.id].thresholdMin),
        thresholdMax: Number(settings[type.id].thresholdMax),
      })),
    };

    const validationStatuses = selectedTypes.map((type) => settings[type.id]?.validation?.status);
    const hasOutsideRange = validationStatuses.includes("warning");
    const hasUnavailableValidation = validationStatuses.includes("unavailable");

    if (hasOutsideRange || hasUnavailableValidation) {
      setRegistrationWarning({ sensor, hasOutsideRange, hasUnavailableValidation });
      return;
    }

    await persistSensor(sensor);
  };

  return (
    <div className="sensor-setup-workspace">
      {notice?.type === "success" && (
        <div ref={successNoticeRef}>
          <Notice notice={notice} onDismiss={() => setNotice(null)} />
        </div>
      )}

      <div className="sensor-source-segments" role="group" aria-label="센서 등록 방식">
        <button
          type="button"
          className={sourceMode === "existing" ? "is-active" : ""}
          aria-pressed={sourceMode === "existing"}
          onClick={() => clearSelection("existing")}
        >
          기존 기기에서 가져오기
        </button>
        <button
          type="button"
          className={sourceMode === "new" ? "is-active" : ""}
          aria-pressed={sourceMode === "new"}
          onClick={() => clearSelection("new")}
        >
          <Plus aria-hidden="true" /> 새 기기 등록
        </button>
      </div>

      {sourceMode === "existing" && (
        <section className="reusable-sensor-catalog" aria-label="기존 센서 목록">
          {reusableSensorsQuery.isLoading && <p>기존 센서를 불러오는 중...</p>}
          {reusableSensorsQuery.isError && (
            <div className="sensor-column-state">
              <span>기존 센서를 불러오지 못했습니다.</span>
              <button type="button" className="text-button" onClick={reusableSensorsQuery.refetch}>
                다시 시도
              </button>
            </div>
          )}
          {!reusableSensorsQuery.isLoading &&
            !reusableSensorsQuery.isError &&
            reusableSensors.length === 0 && (
              <div className="sensor-catalog-empty">
                <strong>가져올 기존 센서가 없습니다.</strong>
                <span>새 기기 등록을 선택해 첫 센서를 연결하세요.</span>
              </div>
            )}
          <div className="reusable-sensor-options">
            {reusableSensors.map((sensor) => {
              const alreadyRegistered = registeredDeviceEuis.has(
                String(sensor.deviceEui ?? "").trim().toUpperCase(),
              );

              return (
                <button
                  key={sensor.deviceEui}
                  type="button"
                  className={`${selectedDeviceEui === sensor.deviceEui ? "is-selected" : ""} ${alreadyRegistered ? "is-unavailable" : ""}`.trim()}
                  aria-pressed={selectedDeviceEui === sensor.deviceEui}
                  onClick={() => selectReusableSensor(sensor)}
                  disabled={alreadyRegistered}
                >
                  <span>
                    <strong>{sensor.deviceName}</strong>
                    <small>{sensor.deviceEui}</small>
                    {alreadyRegistered && (
                      <small className="reusable-sensor-unavailable-reason">
                        이미 이 재배지에서 사용 중
                      </small>
                    )}
                  </span>
                  <small>
                    {normalizeList(sensor.sensorTypes)
                      .map((type) => `${formatSensorType(type.type)} ${type.valueUnit}`)
                      .join(" · ") || "측정 타입을 다시 선택해 주세요"}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {showSensorForm && (
        <form className="form-stack sensor-setup-form" onSubmit={registerSensor}>
          {notice?.type !== "success" && (
            <Notice notice={notice} onDismiss={() => setNotice(null)} />
          )}

          <div className="form-field-grid">
            <label>
              센서 이름
              <input
                name="deviceName"
                value={sensorForm.deviceName}
                onChange={(event) => updateSensorField("deviceName", event.target.value)}
                placeholder="예: 1번 선반 온습도 센서"
                required
              />
            </label>
            <label>
              모델명
              <input
                name="deviceModel"
                value={sensorForm.deviceModel}
                onChange={(event) => updateSensorField("deviceModel", event.target.value)}
                placeholder="예: TH-100"
                required
              />
            </label>
            <label>
              위치
              <input
                name="location"
                value={sensorForm.location}
                onChange={(event) => updateSensorField("location", event.target.value)}
                maxLength="10"
                placeholder="예: 광주"
                required
              />
            </label>
            <label>
              상세 위치
              <input
                name="locationDetail"
                value={sensorForm.locationDetail}
                onChange={(event) => updateSensorField("locationDetail", event.target.value)}
                placeholder="예: 1번 선반"
                required
              />
            </label>
          </div>
          <label>
            센서 고유번호
            <input
              aria-label="센서 고유번호"
              aria-describedby={isDuplicateDeviceEui ? "sensor-device-eui-error" : undefined}
              aria-invalid={isDuplicateDeviceEui || undefined}
              className={sourceMode === "existing" ? "sensor-device-eui--locked" : undefined}
              name="deviceEui"
              value={sensorForm.deviceEui}
              onChange={(event) => updateSensorField("deviceEui", event.target.value)}
              maxLength="32"
              placeholder="센서에 표시된 EUI"
              disabled={sourceMode === "existing"}
              required
            />
            {sourceMode === "existing" && <small>기존 기기의 고유번호는 변경할 수 없습니다.</small>}
            {isDuplicateDeviceEui && (
              <small id="sensor-device-eui-error" className="sensor-device-eui-error" role="alert">
                이 재배지에 이미 등록된 센서 고유번호입니다.
              </small>
            )}
          </label>

          <fieldset className="sensor-type-picker">
            <legend>이 센서가 측정하는 항목</legend>
            <p>선택한 종류를 인식해 이 재배지의 임계값을 연결합니다.</p>
            {sensorTypesQuery.isLoading && <span>측정 타입을 불러오는 중...</span>}
            {sensorTypesQuery.isError && (
              <button className="text-button" type="button" onClick={sensorTypesQuery.refetch}>
                측정 타입 다시 불러오기
              </button>
            )}
            <div className="sensor-type-options">
              {sensorTypeGroups.map((group) => {
                const selectedType = group.variants.find((type) =>
                  selectedTypeIds.includes(type.id),
                );
                const checked = Boolean(selectedType);
                const typeName = formatSensorType(group.type);
                const hasMultipleUnits = group.variants.length > 1;
                const checkboxLabel = hasMultipleUnits
                  ? typeName
                  : `${typeName} (${group.variants[0].valueUnit})`;
                const setting = selectedType ? settings[selectedType.id] : null;

                return (
                  <div
                    key={group.type}
                    className={`sensor-type-option ${checked ? "is-selected" : ""}`}
                  >
                    <label className="sensor-type-option__selection">
                      <input
                        aria-label={checkboxLabel}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTypeGroup(group)}
                      />
                      <span>
                        <strong>{typeName}</strong>
                        <small>
                          {selectedType
                            ? `${selectedType.valueUnit} ${setting?.requiresValidation ? "· AI 검증 필요" : "· 재배지 임계값 적용"}`
                            : hasMultipleUnits
                              ? "측정 단위를 선택할 수 있습니다."
                              : `${group.variants[0].valueUnit} · AI 검증 필요`}
                        </small>
                      </span>
                      {checked && <CheckCircle2 aria-hidden="true" />}
                    </label>

                    {checked && hasMultipleUnits && (
                      <div
                        className="sensor-unit-segments"
                        role="radiogroup"
                        aria-label={`${typeName} 단위`}
                      >
                        {group.variants.map((type) => (
                          <label
                            key={type.id}
                            className={selectedType?.id === type.id ? "is-selected" : ""}
                          >
                            <input
                              aria-label={`${typeName} ${type.valueUnit}`}
                              type="radio"
                              name={`sensor-unit-${group.type}`}
                              checked={selectedType?.id === type.id}
                              onChange={() => selectUnit(group, type)}
                            />
                            <span>{type.valueUnit}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="sensor-threshold-list">
            {selectedTypes.map((type) => {
              const setting = settings[type.id];
              const locked = !setting?.requiresValidation;
              const validation = setting?.validation;

              return (
                <fieldset key={type.id}>
                  <legend>
                    {formatSensorType(type.type)} ({type.valueUnit})
                  </legend>
                  <label>
                    최소값
                    <input
                      aria-label={`${formatSensorType(type.type)} 최소 임계값`}
                      type="number"
                      step="any"
                      value={setting?.thresholdMin ?? ""}
                      onChange={(event) =>
                        updateThreshold(type.id, "thresholdMin", event.target.value)
                      }
                      disabled={locked}
                      required
                    />
                  </label>
                  <label>
                    최대값
                    <input
                      aria-label={`${formatSensorType(type.type)} 최대 임계값`}
                      type="number"
                      step="any"
                      value={setting?.thresholdMax ?? ""}
                      onChange={(event) =>
                        updateThreshold(type.id, "thresholdMax", event.target.value)
                      }
                      disabled={locked}
                      required
                    />
                  </label>
                  {!locked && (
                    <div className="threshold-actions">
                      <button
                        className="button button--secondary"
                        type="button"
                        onClick={() => validateThreshold(type)}
                        disabled={validation?.pending}
                      >
                        {validation?.pending ? "검증 중..." : "AI 범위 검증"}
                      </button>
                    </div>
                  )}
                  {validation && (
                    <p className={validation.valid ? "validation-success" : "validation-error"}>
                      {validation.message}
                    </p>
                  )}
                </fieldset>
              );
            })}
          </div>

          <button
            className="button button--primary button--wide"
            type="submit"
            disabled={!canSubmit}
          >
            {busy ? "등록 중..." : "센서 등록"}
          </button>
        </form>
      )}

      {registrationWarning && (
        <Modal
          title="AI 검증 경고"
          className="modal-card--warning"
          onClose={() => setRegistrationWarning(null)}
        >
          <div className="range-warning-dialog">
            <TriangleAlert aria-hidden="true" />
            {registrationWarning.hasOutsideRange && (
              <p>
                AI 권장 범위를 벗어난 임계값이 있습니다. 예상과 다른 재배 환경이 만들어질 수 있지만,
                등록 후 재배지에서 다시 수정할 수 있습니다.
              </p>
            )}
            {registrationWarning.hasUnavailableValidation && (
              <p>
                AI 검증을 완료하지 못했습니다. 입력한 값으로 우선 등록할 수 있으며, 등록 후
                재배지에서 다시 검증하거나 수정할 수 있습니다.
              </p>
            )}
            <div className="form-actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setRegistrationWarning(null)}
                disabled={busy}
              >
                다시 확인
              </button>
              <button
                className="button button--warning"
                type="button"
                onClick={() => persistSensor(registrationWarning.sensor)}
                disabled={busy}
              >
                {busy ? "등록 중..." : "경고 확인 후 등록"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
