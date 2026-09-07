import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { jsonRequest, request } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { formatSensorType, normalizeList } from "../../utils/formatters";
import CultivationSensorSetupStep from "./CultivationSensorSetupStep";

export default function SensorManager({ cultivationId, sensors, canManage, onClose }) {
  const [activeTab, setActiveTab] = useState("registered");
  const [thresholdDrafts, setThresholdDrafts] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const sensorTypesQuery = useQuery({
    queryKey: ["sensor-types"],
    queryFn: () => request("/cultivations/sensor-types"),
    enabled: canManage,
    staleTime: 300_000,
  });

  const registeredSensors = normalizeList(sensors?.sensors);
  const environmentSettings = normalizeList(sensors?.environmentSettings);
  const sensorTypes = normalizeList(sensorTypesQuery.data?.sensorTypeInfoResponses);
  const registeredTypeIds = useMemo(
    () =>
      new Set(
        registeredSensors.flatMap((sensor) =>
          normalizeList(sensor.sensorTypes).map((type) => type.sensorTypeId),
        ),
      ),
    [registeredSensors],
  );
  const editableSettings = environmentSettings.filter((setting) =>
    registeredTypeIds.has(setting.sensorTypeId),
  );

  useEffect(() => {
    setThresholdDrafts(
      Object.fromEntries(
        environmentSettings.map((setting) => [
          setting.sensorTypeId,
          {
            thresholdMin: String(setting.thresholdMin ?? ""),
            thresholdMax: String(setting.thresholdMax ?? ""),
          },
        ]),
      ),
    );
  }, [environmentSettings]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cultivations", "detail", cultivationId] }),
      queryClient.invalidateQueries({ queryKey: ["cultivations", "preview", cultivationId] }),
      queryClient.invalidateQueries({ queryKey: ["cultivations", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["reusable-sensors", Number(cultivationId)] }),
    ]);
  };

  const handleSensorRegistered = async (sensor) => {
    await refresh();
    setNotice({ type: "success", message: `${sensor.deviceName} 센서를 등록했습니다.` });
    setActiveTab("registered");
  };

  const updateThresholdDraft = (sensorTypeId, field, value) => {
    setThresholdDrafts((current) => ({
      ...current,
      [sensorTypeId]: { ...current[sensorTypeId], [field]: value },
    }));
  };

  const updateEnvironmentSetting = async (setting) => {
    const draft = thresholdDrafts[setting.sensorTypeId];
    const thresholdMin = Number(draft?.thresholdMin);
    const thresholdMax = Number(draft?.thresholdMax);
    const type = sensorTypes.find((item) => item.id === setting.sensorTypeId);
    const typeName = formatSensorType(type?.type);

    if (
      !Number.isFinite(thresholdMin) ||
      !Number.isFinite(thresholdMax) ||
      thresholdMin >= thresholdMax
    ) {
      setNotice({ type: "error", message: `${typeName}: 최소값은 최대값보다 작아야 합니다.` });
      return;
    }

    setBusy(true);
    try {
      await jsonRequest(`/cultivations/${cultivationId}/environment-settings`, "PUT", {
        sensorTypeId: setting.sensorTypeId,
        thresholdMin,
        thresholdMax,
      });
      setNotice({ type: "success", message: `${typeName} 임계값을 수정했습니다.` });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const deleteSensor = async (sensor) => {
    if (!window.confirm(`${sensor.deviceName} 센서를 삭제할까요?`)) return;
    setBusy(true);
    try {
      await request(`/cultivations/${cultivationId}/sensors/${sensor.sensorId}`, {
        method: "DELETE",
      });
      setNotice({ type: "success", message: "센서를 삭제했습니다." });
      await refresh();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="센서 관리" onClose={onClose} className="modal-card--wide">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      {canManage && (
        <div className="sensor-manager-tabs" role="tablist" aria-label="센서 관리 보기">
          <button
            id="sensor-manager-registered-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "registered"}
            aria-controls="sensor-manager-registered-panel"
            className={activeTab === "registered" ? "is-active" : ""}
            onClick={() => setActiveTab("registered")}
          >
            <ListChecks aria-hidden="true" /> 등록된 센서
          </button>
          <button
            id="sensor-manager-add-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "add"}
            aria-controls="sensor-manager-add-panel"
            className={activeTab === "add" ? "is-active" : ""}
            onClick={() => setActiveTab("add")}
          >
            <Plus aria-hidden="true" /> 센서 추가
          </button>
        </div>
      )}

      {(!canManage || activeTab === "registered") && (
        <div
          id="sensor-manager-registered-panel"
          role={canManage ? "tabpanel" : undefined}
          aria-labelledby={canManage ? "sensor-manager-registered-tab" : undefined}
          className="sensor-manager-panel"
        >
          <section className="registered-sensor-list" aria-label="등록 센서 목록">
            <div className="manager-section-heading">
              <div>
                <h3>이 재배지의 센서</h3>
                <p>실제 연결된 기기와 측정 항목을 확인합니다.</p>
              </div>
            </div>
            {registeredSensors.map((sensor) => (
              <article key={sensor.sensorId}>
                <div>
                  <strong>{sensor.deviceName}</strong>
                  <span>
                    {sensor.deviceModel} · {sensor.deviceEui}
                  </span>
                  <small>
                    {sensor.location} {sensor.locationDetail} ·{" "}
                    {normalizeList(sensor.sensorTypes)
                      .map((type) => formatSensorType(type.type))
                      .join(", ")}
                  </small>
                </div>
                {canManage && (
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    aria-label={`${sensor.deviceName} 삭제`}
                    onClick={() => deleteSensor(sensor)}
                    disabled={busy}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                )}
              </article>
            ))}
            {registeredSensors.length === 0 && (
              <p className="modal-empty">등록된 센서가 없습니다.</p>
            )}
          </section>

          {canManage && editableSettings.length > 0 && (
            <section className="environment-setting-manager" aria-label="재배 환경 임계값">
              <div className="manager-section-heading">
                <div>
                  <h3>재배 환경 임계값</h3>
                  <p>경작지에서 관리할 고유한 센서 임계값 설정입니다.</p>
                </div>
              </div>
              <div className="environment-setting-manager__list">
                {editableSettings.map((setting) => {
                  const type = sensorTypes.find((item) => item.id === setting.sensorTypeId);
                  const typeName = formatSensorType(type?.type);
                  const unit = type?.valueUnit || "-";
                  const draft = thresholdDrafts[setting.sensorTypeId] || {};

                  return (
                    <div
                      className="environment-setting-manager__row"
                      key={setting.sensorTypeId}
                      role="group"
                      aria-label={`${typeName} ${unit} 임계값`}
                    >
                      <div className="environment-setting-manager__identity">
                        <span>
                          <strong>{typeName}</strong>
                          <small>{unit}</small>
                        </span>
                        <em>재배지 기준</em>
                      </div>
                      <div className="environment-setting-manager__range">
                        <label>
                          <span>최소값</span>
                          <span className="environment-setting-manager__input">
                            <input
                              aria-label={`${typeName} 최소값`}
                              type="number"
                              step="any"
                              value={draft.thresholdMin ?? ""}
                              onChange={(event) =>
                                updateThresholdDraft(
                                  setting.sensorTypeId,
                                  "thresholdMin",
                                  event.target.value,
                                )
                              }
                            />
                            <small>{unit}</small>
                          </span>
                        </label>
                        <span className="environment-setting-manager__separator" aria-hidden="true">
                          ~
                        </span>
                        <label>
                          <span>최대값</span>
                          <span className="environment-setting-manager__input">
                            <input
                              aria-label={`${typeName} 최대값`}
                              type="number"
                              step="any"
                              value={draft.thresholdMax ?? ""}
                              onChange={(event) =>
                                updateThresholdDraft(
                                  setting.sensorTypeId,
                                  "thresholdMax",
                                  event.target.value,
                                )
                              }
                            />
                            <small>{unit}</small>
                          </span>
                        </label>
                      </div>
                      <button
                        className="button button--secondary"
                        type="button"
                        aria-label={`${typeName} 임계값 저장`}
                        onClick={() => updateEnvironmentSetting(setting)}
                        disabled={busy}
                      >
                        <Save aria-hidden="true" /> 저장
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {canManage && activeTab === "add" && (
        <div
          id="sensor-manager-add-panel"
          role="tabpanel"
          aria-labelledby="sensor-manager-add-tab"
          className="sensor-manager-panel sensor-manager-panel--add"
        >
          <div className="manager-section-heading">
            <div>
              <h3>이 재배지에 센서 추가</h3>
              <p>기존 기기를 가져오거나 새 기기를 등록하고 측정 타입을 연결합니다.</p>
            </div>
          </div>
          <CultivationSensorSetupStep
            cultivationId={cultivationId}
            environmentSettings={environmentSettings}
            registeredSensors={registeredSensors}
            onRegistered={handleSensorRegistered}
          />
        </div>
      )}
    </Modal>
  );
}
