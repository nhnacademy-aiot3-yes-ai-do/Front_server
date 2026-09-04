import { useQuery } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Droplets,
  Sun,
  Thermometer,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCultivation, cultivationKeys, getMushroomGuide } from "../../api/cultivations";
import { request } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { ErrorState, LoadingState } from "../../components/PageState";
import CultivationSensorSetupStep from "../../features/cultivations/CultivationSensorSetupStep";
import CultivationCreationStepper from "../../features/cultivations/CultivationCreationStepper";
import { formatSensorType, normalizeList } from "../../utils/formatters";

const DEFAULT_ENVIRONMENT_TYPES = [
  { conditionKey: "temperature", type: "TEMPERATURE", unit: "°C" },
  { conditionKey: "humidity", type: "HUMIDITY", unit: "%" },
  { conditionKey: "co2", type: "CO2", unit: "ppm" },
  { conditionKey: "light", type: "LIGHT", unit: "lux" },
];

const SENSOR_TYPE_PRESENTATION = {
  TEMPERATURE: { Icon: Thermometer, tone: "temperature" },
  HUMIDITY: { Icon: Droplets, tone: "humidity" },
  CO2: { Icon: Cloud, tone: "co2" },
  LIGHT: { Icon: Sun, tone: "light" },
};

function buildEnvironmentSettings(mushroom, guide) {
  const references = normalizeList(mushroom?.thresholdInfoResponses).filter(
    (threshold) => !threshold.thresholdType || threshold.thresholdType === "GROWTH",
  );

  return DEFAULT_ENVIRONMENT_TYPES.map((definition) => {
    const reference = references.find(
      (threshold) =>
        threshold.sensorType?.type === definition.type &&
        threshold.sensorType?.valueUnit === definition.unit,
    );
    const recommendedRange = guide?.cultivationCondition?.[definition.conditionKey];

    if (!reference || recommendedRange?.min == null || recommendedRange?.max == null) {
      return null;
    }

    return {
      sensorTypeId: reference.sensorType.id,
      sensorType: reference.sensorType.type,
      unit: reference.sensorType.valueUnit,
      recommendedMin: Number(recommendedRange.min),
      recommendedMax: Number(recommendedRange.max),
      thresholdMin: String(recommendedRange.min),
      thresholdMax: String(recommendedRange.max),
    };
  }).filter(Boolean);
}

function getEnvironmentSettingError(setting) {
  const minimumText = String(setting.thresholdMin ?? "").trim();
  const maximumText = String(setting.thresholdMax ?? "").trim();

  if (!minimumText || !maximumText) {
    return "최소값과 최대값을 모두 입력해 주세요.";
  }

  const minimum = Number(minimumText);
  const maximum = Number(maximumText);

  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return "숫자 형식으로 입력해 주세요.";
  }
  if (minimum >= maximum) {
    return "최소값은 최대값보다 작아야 합니다.";
  }
  if (setting.sensorType === "HUMIDITY" && (minimum < 0 || maximum > 100)) {
    return "습도는 0~100% 범위로 입력해 주세요.";
  }
  if (["CO2", "LIGHT"].includes(setting.sensorType) && minimum < 0) {
    return `${formatSensorType(setting.sensorType)} 값은 0 이상이어야 합니다.`;
  }

  return null;
}

function validateEnvironmentSettings(settings) {
  if (settings.length !== DEFAULT_ENVIRONMENT_TYPES.length) {
    return { error: "기본 재배 환경 4개의 추천값을 모두 불러와야 합니다." };
  }

  for (const setting of settings) {
    const error = getEnvironmentSettingError(setting);
    if (error) return { error: `${formatSensorType(setting.sensorType)}: ${error}` };
  }

  return {
    outsideRecommendation: settings.some(
      (setting) =>
        Number(setting.thresholdMin) < setting.recommendedMin ||
        Number(setting.thresholdMax) > setting.recommendedMax,
    ),
  };
}

export default function CultivationCreatePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [cultivationName, setCultivationName] = useState("");
  const [environmentSettings, setEnvironmentSettings] = useState([]);
  const [manualSettingEnabled, setManualSettingEnabled] = useState(false);
  const [mushroomId, setMushroomId] = useState("");
  const [createdCultivationId, setCreatedCultivationId] = useState(null);
  const [registeredSensors, setRegisteredSensors] = useState([]);
  const [rangeWarningOpen, setRangeWarningOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const referencesQuery = useQuery({
    queryKey: ["mushroom-references"],
    queryFn: () => request("/cultivations/mushroom-references"),
  });

  const mushrooms = useMemo(
    () => normalizeList(referencesQuery.data?.mushroomReferenceInfoResponses),
    [referencesQuery.data],
  );
  const selectedMushroom = useMemo(
    () => mushrooms.find((mushroom) => String(mushroom.id) === mushroomId),
    [mushrooms, mushroomId],
  );
  const guideQuery = useQuery({
    queryKey: cultivationKeys.guide(mushroomId),
    queryFn: () => getMushroomGuide(mushroomId),
    enabled: Boolean(mushroomId),
    staleTime: 300_000,
  });
  const hasEnvironmentSettingErrors = environmentSettings.some((setting) =>
    Boolean(getEnvironmentSettingError(setting)),
  );

  useEffect(() => {
    if (!selectedMushroom) {
      setEnvironmentSettings([]);
      setManualSettingEnabled(false);
      return;
    }
    if (!guideQuery.data) return;

    setEnvironmentSettings(buildEnvironmentSettings(selectedMushroom, guideQuery.data));
    setManualSettingEnabled(false);
  }, [selectedMushroom, guideQuery.data]);

  const moveToEnvironmentStep = (event) => {
    event.preventDefault();
    if (!cultivationName.trim() || !mushroomId) {
      setNotice({ type: "error", message: "재배지 이름과 버섯 종류를 입력해 주세요." });
      return;
    }
    setNotice(null);
    setCurrentStep(2);
  };

  const createAndContinue = async () => {
    const validation = validateEnvironmentSettings(environmentSettings);
    if (validation.error) {
      setNotice({ type: "error", message: validation.error });
      return;
    }

    setRangeWarningOpen(false);
    setSubmitting(true);
    setNotice(null);

    try {
      const response = await createCultivation({
        name: cultivationName.trim(),
        mushroomId: Number(mushroomId),
        environmentSettingRequests: environmentSettings.map((setting) => ({
          sensorTypeId: setting.sensorTypeId,
          thresholdMin: Number(setting.thresholdMin),
          thresholdMax: Number(setting.thresholdMax),
        })),
      });
      const cultivationId = response?.cultivationId ?? response?.data?.cultivationId;
      if (!cultivationId) throw new Error("생성된 재배지 ID를 확인하지 못했습니다.");

      setCreatedCultivationId(cultivationId);
      setCurrentStep(3);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const submitEnvironmentSettings = (event) => {
    event.preventDefault();
    const validation = validateEnvironmentSettings(environmentSettings);
    if (validation.error) {
      setNotice({ type: "error", message: validation.error });
      return;
    }
    if (validation.outsideRecommendation) {
      setRangeWarningOpen(true);
      return;
    }
    createAndContinue();
  };

  const updateEnvironmentSetting = (sensorTypeId, field, value) => {
    setEnvironmentSettings((currentSettings) =>
      currentSettings.map((setting) =>
        setting.sensorTypeId === sensorTypeId ? { ...setting, [field]: value } : setting,
      ),
    );
  };

  if (referencesQuery.isLoading) return <LoadingState message="버섯 기준정보를 불러오고 있어요." />;
  if (referencesQuery.isError)
    return <ErrorState error={referencesQuery.error} onRetry={referencesQuery.refetch} />;

  return (
    <main className="workspace-page">
      <section className="workspace-panel form-page cultivation-create-page">
        <header className="page-heading">
          <div>
            <p className="eyebrow">새로운 재배 시작</p>
            <h1>재배지 만들기</h1>
            <p>재배 환경을 정한 뒤 실제 사용할 센서를 연결합니다.</p>
          </div>
        </header>

        <CultivationCreationStepper currentStep={currentStep} />
        <Notice notice={notice} onDismiss={() => setNotice(null)} />

        {currentStep === 1 && (
          <form
            className="form-stack form-stack--roomy creation-stage"
            onSubmit={moveToEnvironmentStep}
          >
            <div className="creation-stage__heading">
              <span>1단계</span>
              <h2>재배지 정보를 입력해 주세요</h2>
              <p>재배지를 구분할 이름과 키울 버섯을 선택합니다.</p>
            </div>
            <label>
              재배지 이름
              <input
                name="name"
                maxLength="100"
                value={cultivationName}
                onChange={(event) => setCultivationName(event.target.value)}
                placeholder="예: 느타리 1번 재배지"
                required
              />
            </label>
            <label>
              버섯 종류
              <select
                value={mushroomId}
                onChange={(event) => setMushroomId(event.target.value)}
                required
              >
                <option value="">버섯을 선택하세요</option>
                {mushrooms.map((mushroom) => (
                  <option key={mushroom.id} value={mushroom.id}>
                    {mushroom.mushroomNameKo}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions form-actions--between">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => navigate(-1)}
              >
                취소
              </button>
              <button className="button button--primary" type="submit">
                다음: 환경 설정 <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </form>
        )}

        {currentStep === 2 && (
          <form
            className="form-stack form-stack--roomy creation-stage"
            onSubmit={submitEnvironmentSettings}
          >
            <div className="creation-stage__heading">
              <span>2단계</span>
              <h2>AI 추천 환경을 확인해 주세요</h2>
              <p>추천 범위를 그대로 사용하거나 수동 설정을 켜서 조정할 수 있습니다.</p>
            </div>

            {selectedMushroom && (
              <section className="reference-card" aria-busy={guideQuery.isFetching}>
                <div className="reference-card__heading">
                  <div>
                    <h2>{selectedMushroom.mushroomNameKo} 권장 재배 환경</h2>
                    <p>각 항목에 AI 추천값이 미리 적용되어 있습니다.</p>
                  </div>
                  {guideQuery.isFetching && (
                    <span className="reference-card__loading">추천값 불러오는 중</span>
                  )}
                  {guideQuery.isError && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => guideQuery.refetch()}
                    >
                      추천값 다시 불러오기
                    </button>
                  )}
                </div>

                <label className="manual-setting-control">
                  <span>
                    <strong>수동 설정</strong>
                    <small>직접 범위를 조정하려면 켜세요.</small>
                  </span>
                  <input
                    aria-label="수동 설정"
                    type="checkbox"
                    checked={manualSettingEnabled}
                    onChange={(event) => setManualSettingEnabled(event.target.checked)}
                  />
                </label>

                <div
                  className={`threshold-grid ${
                    guideQuery.isFetching ? "threshold-grid--loading" : ""
                  }`}
                >
                  {environmentSettings.map((setting) => {
                    const presentation = SENSOR_TYPE_PRESENTATION[setting.sensorType];
                    const SensorIcon = presentation.Icon;
                    const settingError = getEnvironmentSettingError(setting);
                    const errorId = `environment-setting-${setting.sensorTypeId}-error`;
                    const outsideRecommendation =
                      !settingError &&
                      (Number(setting.thresholdMin) < setting.recommendedMin ||
                        Number(setting.thresholdMax) > setting.recommendedMax);

                    return (
                      <fieldset
                        key={setting.sensorTypeId}
                        className={`threshold-card threshold-card--${presentation.tone} ${
                          settingError
                            ? "threshold-card--invalid"
                            : outsideRecommendation
                              ? "threshold-card--warning"
                              : ""
                        }`}
                      >
                        <legend className="threshold-card__legend">
                          <span className="threshold-card__icon">
                            <SensorIcon size={18} aria-hidden="true" />
                          </span>
                          <span>{formatSensorType(setting.sensorType)}</span>
                          <small>AI 추천</small>
                        </legend>
                        <p className="threshold-card__recommendation">
                          추천 {setting.recommendedMin} ~ {setting.recommendedMax} {setting.unit}
                        </p>
                        <label>
                          최소값
                          <input
                            aria-label={`${formatSensorType(setting.sensorType)} 최소값`}
                            type="number"
                            step="any"
                            min={
                              ["HUMIDITY", "CO2", "LIGHT"].includes(setting.sensorType)
                                ? 0
                                : undefined
                            }
                            max={setting.sensorType === "HUMIDITY" ? 100 : undefined}
                            value={setting.thresholdMin}
                            aria-invalid={Boolean(settingError)}
                            aria-describedby={settingError ? errorId : undefined}
                            onChange={(event) =>
                              updateEnvironmentSetting(
                                setting.sensorTypeId,
                                "thresholdMin",
                                event.target.value,
                              )
                            }
                            disabled={!manualSettingEnabled}
                            required
                          />
                        </label>
                        <label>
                          최대값 ({setting.unit})
                          <input
                            aria-label={`${formatSensorType(setting.sensorType)} 최대값`}
                            type="number"
                            step="any"
                            min={
                              ["HUMIDITY", "CO2", "LIGHT"].includes(setting.sensorType)
                                ? 0
                                : undefined
                            }
                            max={setting.sensorType === "HUMIDITY" ? 100 : undefined}
                            value={setting.thresholdMax}
                            aria-invalid={Boolean(settingError)}
                            aria-describedby={settingError ? errorId : undefined}
                            onChange={(event) =>
                              updateEnvironmentSetting(
                                setting.sensorTypeId,
                                "thresholdMax",
                                event.target.value,
                              )
                            }
                            disabled={!manualSettingEnabled}
                            required
                          />
                        </label>
                        {settingError ? (
                          <small id={errorId} className="threshold-card__error" role="alert">
                            {settingError}
                          </small>
                        ) : outsideRecommendation ? (
                          <small className="threshold-card__warning">
                            추천 범위를 벗어났습니다.
                          </small>
                        ) : null}
                      </fieldset>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="form-actions form-actions--between">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setCurrentStep(1)}
              >
                <ChevronLeft aria-hidden="true" /> 이전
              </button>
              <button
                className="button button--primary"
                type="submit"
                disabled={
                  submitting ||
                  guideQuery.isFetching ||
                  guideQuery.isError ||
                  hasEnvironmentSettingErrors ||
                  environmentSettings.length !== DEFAULT_ENVIRONMENT_TYPES.length
                }
              >
                {submitting ? "생성 중..." : "재배지 생성 후 센서 등록"}
                {!submitting && <ChevronRight aria-hidden="true" />}
              </button>
            </div>
          </form>
        )}

        {currentStep === 3 && createdCultivationId && (
          <section className="creation-stage sensor-setup-stage">
            <div className="creation-stage__heading">
              <span>3단계</span>
              <h2>사용할 센서를 등록해 주세요</h2>
              <p>센서를 하나 이상 등록해야 재배지 설정을 완료할 수 있습니다.</p>
            </div>

            <div className="creation-success-banner" role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>{cultivationName.trim()}가 생성되었습니다.</strong>
                <span>이제 이 재배지에서 사용할 실제 센서를 연결하세요.</span>
              </div>
            </div>

            {registeredSensors.length > 0 && (
              <section className="setup-registered-sensors" aria-label="이번에 등록한 센서">
                <h3>등록 완료 센서</h3>
                {registeredSensors.map((sensor) => (
                  <div key={`${sensor.deviceEui}-${sensor.deviceName}`}>
                    <CheckCircle2 aria-hidden="true" />
                    <span>
                      <strong>{sensor.deviceName}</strong>
                      <small>{sensor.deviceEui}</small>
                    </span>
                  </div>
                ))}
              </section>
            )}

            <CultivationSensorSetupStep
              cultivationId={createdCultivationId}
              environmentSettings={environmentSettings}
              registeredSensors={registeredSensors}
              onRegistered={(sensor) => setRegisteredSensors((current) => [...current, sensor])}
            />

            <div className="form-actions">
              <button
                className="button button--primary"
                type="button"
                disabled={registeredSensors.length === 0}
                onClick={() => navigate(`/cultivations/${createdCultivationId}`)}
              >
                <Check aria-hidden="true" /> 설정 완료
              </button>
            </div>
          </section>
        )}
      </section>

      {rangeWarningOpen && (
        <Modal
          title="추천 범위 확인"
          className="modal-card--warning"
          onClose={() => setRangeWarningOpen(false)}
        >
          <div className="range-warning-dialog">
            <TriangleAlert aria-hidden="true" />
            <p>
              AI 추천 범위를 벗어난 설정이 있습니다. 예상과 다른 재배 결과가 생길 수 있지만, 생성
              후에도 환경 범위를 다시 수정할 수 있습니다.
            </p>
            <div className="form-actions">
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setRangeWarningOpen(false)}
              >
                다시 확인
              </button>
              <button className="button button--warning" type="button" onClick={createAndContinue}>
                그래도 생성
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
