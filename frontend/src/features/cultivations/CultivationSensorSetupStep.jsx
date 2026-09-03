import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { jsonRequest, request, unwrapApiResponse } from "../../api/http";
import Notice from "../../components/Notice";
import { formatSensorType, normalizeList } from "../../utils/formatters";

function initialSetting(type, environmentSettings) {
  const recommended = environmentSettings.find((setting) => setting.sensorTypeId === type.id);

  return {
    thresholdMin: recommended?.thresholdMin ?? "",
    thresholdMax: recommended?.thresholdMax ?? "",
    requiresValidation: !recommended,
    validation: recommended
      ? { valid: true, message: "2단계에서 확정한 재배 환경 범위를 적용합니다." }
      : null,
  };
}

export default function CultivationSensorSetupStep({
  cultivationId,
  environmentSettings,
  onRegistered,
}) {
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);
  const [settings, setSettings] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const sensorTypesQuery = useQuery({
    queryKey: ["sensor-types"],
    queryFn: () => request("/cultivations/sensor-types"),
    staleTime: 300_000,
  });

  const sensorTypes = normalizeList(sensorTypesQuery.data?.sensorTypeInfoResponses);
  const selectedTypes = selectedTypeIds
    .map((id) => sensorTypes.find((type) => type.id === id))
    .filter(Boolean);

  const toggleType = (type) => {
    if (selectedTypeIds.includes(type.id)) {
      setSelectedTypeIds((ids) => ids.filter((id) => id !== type.id));
      setSettings((current) => {
        const next = { ...current };
        delete next[type.id];
        return next;
      });
      return;
    }

    setSelectedTypeIds((ids) => [...ids, type.id]);
    setSettings((current) => ({
      ...current,
      [type.id]: initialSetting(type, environmentSettings),
    }));
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

    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum) {
      setSettings((current) => ({
        ...current,
        [type.id]: {
          ...current[type.id],
          validation: {
            valid: false,
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
        validation: { valid: false, pending: true, message: "AI 검증 중..." },
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

      setSettings((current) => ({
        ...current,
        [type.id]: {
          ...current[type.id],
          validation: {
            valid: Boolean(result?.isValid ?? result?.valid),
            message: result?.message || "검증 결과를 확인하지 못했습니다.",
          },
        },
      }));
    } catch (error) {
      setSettings((current) => ({
        ...current,
        [type.id]: {
          ...current[type.id],
          validation: { valid: false, message: error.message },
        },
      }));
    }
  };

  const registerSensor = async (event) => {
    event.preventDefault();

    if (selectedTypes.length === 0) {
      setNotice({ type: "error", message: "측정 타입을 하나 이상 선택해 주세요." });
      return;
    }

    const hasInvalidSetting = selectedTypes.some((type) => {
      const setting = settings[type.id];
      const minimum = Number(setting?.thresholdMin);
      const maximum = Number(setting?.thresholdMax);
      return (
        !Number.isFinite(minimum) ||
        !Number.isFinite(maximum) ||
        minimum >= maximum ||
        !setting?.validation?.valid
      );
    });

    if (hasInvalidSetting) {
      setNotice({
        type: "error",
        message: "선택한 모든 측정 타입의 범위를 확인해 주세요.",
      });
      return;
    }

    const form = event.currentTarget;
    const values = new FormData(form);
    const sensor = {
      deviceEui: String(values.get("deviceEui")).trim(),
      deviceModel: String(values.get("deviceModel")).trim(),
      deviceName: String(values.get("deviceName")).trim(),
      location: String(values.get("location")).trim(),
      locationDetail: String(values.get("locationDetail")).trim(),
      sensorSettings: selectedTypes.map((type) => ({
        sensorTypeId: type.id,
        thresholdMin: Number(settings[type.id].thresholdMin),
        thresholdMax: Number(settings[type.id].thresholdMax),
      })),
    };

    setBusy(true);
    try {
      await jsonRequest(`/cultivations/${cultivationId}/sensors`, "POST", sensor);
      form.reset();
      setSelectedTypeIds([]);
      setSettings({});
      setNotice({ type: "success", message: `${sensor.deviceName} 센서를 등록했습니다.` });
      onRegistered(sensor);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form-stack sensor-setup-form" onSubmit={registerSensor}>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      <div className="form-field-grid">
        <label>
          센서 이름
          <input name="deviceName" placeholder="예: 1번 선반 온습도 센서" required />
        </label>
        <label>
          모델명
          <input name="deviceModel" placeholder="예: TH-100" required />
        </label>
        <label>
          위치
          <input name="location" maxLength="10" placeholder="예: 광주" required />
        </label>
        <label>
          상세 위치
          <input name="locationDetail" placeholder="예: 1번 선반" required />
        </label>
      </div>
      <label>
        센서 고유번호
        <input name="deviceEui" maxLength="32" placeholder="센서에 표시된 EUI" required />
      </label>

      <fieldset className="sensor-type-picker">
        <legend>이 센서가 측정하는 항목</legend>
        <p>여러 항목을 측정하는 센서라면 모두 선택하세요.</p>
        {sensorTypesQuery.isLoading && <span>측정 타입을 불러오는 중...</span>}
        {sensorTypesQuery.isError && (
          <button className="text-button" type="button" onClick={() => sensorTypesQuery.refetch()}>
            측정 타입 다시 불러오기
          </button>
        )}
        <div className="sensor-type-options">
          {sensorTypes.map((type) => {
            const checked = selectedTypeIds.includes(type.id);
            const recommended = environmentSettings.some(
              (setting) => setting.sensorTypeId === type.id,
            );

            return (
              <label key={type.id} className={`sensor-type-option ${checked ? "is-selected" : ""}`}>
                <input
                  aria-label={`${formatSensorType(type.type)} (${type.valueUnit})`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleType(type)}
                />
                <span>
                  <strong>{formatSensorType(type.type)}</strong>
                  <small>
                    {type.valueUnit} {recommended ? "· 추천 범위 적용" : "· AI 검증 필요"}
                  </small>
                </span>
                {checked && <CheckCircle2 aria-hidden="true" />}
              </label>
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
                  onChange={(event) => updateThreshold(type.id, "thresholdMin", event.target.value)}
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
                  onChange={(event) => updateThreshold(type.id, "thresholdMax", event.target.value)}
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

      <button className="button button--primary button--wide" type="submit" disabled={busy}>
        {busy ? "등록 중..." : "센서 등록"}
      </button>
    </form>
  );
}
