import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { jsonRequest, request, unwrapApiResponse } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { formatSensorType, normalizeList } from "../../utils/formatters";

export default function SensorManager({ cultivationId, sensors, canManage, onClose }) {
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);
  const [typeToAdd, setTypeToAdd] = useState("");
  const [validations, setValidations] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const queryClient = useQueryClient();
  const sensorTypesQuery = useQuery({
    queryKey: ["sensor-types"],
    queryFn: () => request("/cultivations/sensor-types"),
    enabled: canManage,
    staleTime: 300_000,
  });

  const registeredSensors = normalizeList(sensors?.sensors);
  const sensorTypes = normalizeList(sensorTypesQuery.data?.sensorTypeInfoResponses);
  const selectedTypes = selectedTypeIds
    .map((id) => sensorTypes.find((type) => type.id === id))
    .filter(Boolean);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cultivations", "detail", cultivationId] }),
      queryClient.invalidateQueries({ queryKey: ["cultivations", "preview", cultivationId] }),
      queryClient.invalidateQueries({ queryKey: ["cultivations", "list"] }),
    ]);
  };

  const addType = () => {
    const id = Number(typeToAdd);
    if (!id || selectedTypeIds.includes(id)) return;
    setSelectedTypeIds((ids) => [...ids, id]);
    setTypeToAdd("");
  };

  const removeType = (id) => {
    setSelectedTypeIds((ids) => ids.filter((item) => item !== id));
    setValidations((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const clearValidation = (id) => {
    setValidations((current) => ({ ...current, [id]: null }));
  };

  const validateThreshold = async (type) => {
    const form = formRef.current;
    const minimum = Number(form?.elements.namedItem(`min-${type.id}`)?.value);
    const maximum = Number(form?.elements.namedItem(`max-${type.id}`)?.value);

    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum >= maximum) {
      setValidations((current) => ({
        ...current,
        [type.id]: {
          valid: false,
          message: "최소값은 최대값보다 작은 숫자여야 합니다.",
        },
      }));
      return;
    }

    setValidations((current) => ({
      ...current,
      [type.id]: { valid: false, pending: true, message: "AI 검증 중…" },
    }));
    try {
      const result = await jsonRequest(`/cultivations/${cultivationId}/sensor-validation`, "POST", {
        sensorTypeId: type.id,
        sensorTypeName: type.type,
        sensorUnit: type.valueUnit,
        userMin: minimum,
        userMax: maximum,
      }).then(unwrapApiResponse);
      setValidations((current) => ({
        ...current,
        [type.id]: {
          valid: Boolean(result?.isValid ?? result?.valid),
          message: result?.message || "검증 결과를 확인하지 못했습니다.",
        },
      }));
    } catch (error) {
      setValidations((current) => ({
        ...current,
        [type.id]: { valid: false, message: error.message },
      }));
    }
  };

  const registerSensor = async (event) => {
    event.preventDefault();
    if (selectedTypes.length === 0) {
      setNotice({ type: "error", message: "측정 타입을 하나 이상 추가해 주세요." });
      return;
    }
    if (selectedTypes.some((type) => !validations[type.id]?.valid)) {
      setNotice({ type: "error", message: "모든 측정 범위의 AI 검증을 통과해 주세요." });
      return;
    }

    const form = event.currentTarget; // [핵심 1] 비동기 통신 전에 form 객체를 미리 보관
    const values = new FormData(form);
    const sensorSettings = selectedTypes.map((type) => ({
      sensorTypeId: type.id,
      thresholdMin: Number(values.get(`min-${type.id}`)),
      thresholdMax: Number(values.get(`max-${type.id}`)),
    }));

    setBusy(true);
    try {
      await jsonRequest(`/cultivations/${cultivationId}/sensors`, "POST", {
        deviceEui: String(values.get("deviceEui")).trim(),
        deviceModel: String(values.get("deviceModel")).trim(),
        deviceName: String(values.get("deviceName")).trim(),
        location: String(values.get("location")).trim(),
        locationDetail: String(values.get("locationDetail")).trim(),
        sensorSettings,
      });
      form?.reset(); // [핵심 2] null이 되지 않는 form 변수로 reset 호출
      setSelectedTypeIds([]);
      setValidations({});
      setNotice({ type: "success", message: "센서를 등록했습니다." });
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
    <Modal title="센서 및 환경 범위 관리" onClose={onClose} className="modal-card--wide">
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <section className="registered-sensor-list" aria-label="등록 센서 목록">
        {registeredSensors.map((sensor) => (
          <article key={sensor.sensorId}>
            <div>
              <strong>{sensor.deviceName}</strong>
              <span>
                {sensor.deviceModel} · {sensor.deviceEui}
              </span>
              <small>
                {sensor.location} {sensor.locationDetail} ·
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
        {registeredSensors.length === 0 && <p className="modal-empty">등록된 센서가 없습니다.</p>}
      </section>

      {canManage && (
        <form ref={formRef} className="form-stack sensor-register-form" onSubmit={registerSensor}>
          <h3>새 센서 등록</h3>
          <div className="form-field-grid">
            <label>
              센서 이름
              <input name="deviceName" placeholder="예: 1번 선반 온습도센서" required />
            </label>
            <label>
              모델명
              <input name="deviceModel" required />
            </label>
            <label>
              위치
              <input name="location" maxLength="10" placeholder="예: 광주광역시" required />
            </label>
            <label>
              상세 위치
              <input name="locationDetail" placeholder="예: 1번 선반" required />
            </label>
          </div>
          <label>
            센서 고유번호
            <input name="deviceEui" required />
          </label>
          <div className="sensor-type-adder">
            <label>
              측정 타입
              <select value={typeToAdd} onChange={(event) => setTypeToAdd(event.target.value)}>
                <option value="">추가할 타입을 선택하세요</option>
                {sensorTypes
                  .filter((type) => !selectedTypeIds.includes(type.id))
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {formatSensorType(type.type)} ({type.valueUnit})
                    </option>
                  ))}
              </select>
            </label>
            <button className="button button--secondary" type="button" onClick={addType}>
              <Plus aria-hidden="true" /> 추가
            </button>
          </div>
          <div className="sensor-threshold-list">
            {selectedTypes.map((type) => {
              const result = validations[type.id];
              return (
                <fieldset key={type.id}>
                  <legend>
                    {formatSensorType(type.type)} ({type.valueUnit})
                  </legend>
                  <label>
                    최소값
                    <input
                        name={`min-${type.id}`}
                        type="number"
                        step="any"
                        onChange={() => setValidations(prev => ({ ...prev, [type.id]: { ...prev[type.id], valid: false } }))}
                        required
                    />
                  </label>
                  <label>
                    최대값
                    <input
                        name={`max-${type.id}`}
                        type="number"
                        step="any"
                        onChange={() => setValidations(prev => ({ ...prev, [type.id]: { ...prev[type.id], valid: false } }))}
                        required
                    />
                  </label>
                  <div className="threshold-actions">
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => validateThreshold(type)}
                      disabled={result?.pending}
                    >
                      범위 검증
                    </button>
                    <button
                      className="text-button text-button--danger"
                      type="button"
                      onClick={() => removeType(type.id)}
                    >
                      제거
                    </button>
                  </div>
                  {result && (
                    <p className={result.valid ? "validation-success" : "validation-error"}>
                      {result.message}
                    </p>
                  )}
                </fieldset>
              );
            })}
          </div>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? "등록 중…" : "센서 등록"}
          </button>
        </form>
      )}
    </Modal>
  );
}
