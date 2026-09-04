import { formatSensorType, normalizeSensorUnit } from "../../utils/formatters";

export default function SensorSparkline({ sensor, sensorType, latest, setting }) {
  const unit = normalizeSensorUnit(latest?.unit || sensorType.valueUnit);
  const value = latest?.value;
  const outside =
    value != null &&
    ((setting?.thresholdMin != null && Number(value) < Number(setting.thresholdMin)) ||
      (setting?.thresholdMax != null && Number(value) > Number(setting.thresholdMax)));

  return (
    <article className={`sensor-spark ${outside ? "sensor-spark--warning" : ""}`}>
      <div className="sensor-spark__top">
        <div>
          <span>{formatSensorType(sensorType.type)}</span>
          <strong>
            {value ?? "-"}
            <small>{unit || ""}</small>
          </strong>
        </div>
        <span className="sensor-spark__state">
          {value == null ? "수집 중" : outside ? "확인 필요" : "안정"}
        </span>
      </div>
      <div className="sensor-spark__meta">
        <span>{sensor.deviceName}</span>
        <span>
          {setting?.thresholdMin ?? "-"}–{setting?.thresholdMax ?? "-"}
          {unit || ""}
        </span>
      </div>
    </article>
  );
}
