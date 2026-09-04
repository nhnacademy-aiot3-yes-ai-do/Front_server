import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  formatDateTime,
  formatSensorType,
  normalizeSensorUnit,
} from "../../utils/formatters";

export default function SensorSparkline({
  cultivationId,
  sensor,
  sensorType,
  latest,
  setting,
  trend = [],
}) {
  const unit = normalizeSensorUnit(latest?.unit || sensorType.valueUnit);
  const gradientId =
    `spark-${cultivationId}-${sensor.deviceEui}-${sensorType.sensorTypeId ?? sensorType.type}-${normalizeSensorUnit(latest?.unit || sensorType.valueUnit)}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "-",
    );
  const points = trend
    .filter((point) => point.measuredAt && point.value != null)
    .map((point) => ({
      measuredAt: formatDateTime(point.measuredAt),
      value: point.value,
    }));
  const value = latest?.value;
  const hasThreshold = setting?.thresholdMin != null || setting?.thresholdMax != null;
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
          {value == null ? "수집 중" : !hasThreshold ? "범위 미등록" : outside ? "확인 필요" : "안정"}
        </span>
      </div>
      <div
        className="sensor-spark__chart"
        aria-label={`${formatSensorType(sensorType.type)} 센서 추이`}
      >
        {points.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={outside ? "#b77e3e" : "#708d66"}
                    stopOpacity={0.32}
                  />
                  <stop offset="100%" stopColor={outside ? "#b77e3e" : "#708d66"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="measuredAt" hide />
              <Tooltip
                formatter={(tooltipValue) => [`${tooltipValue}${unit || ""}`, "측정값"]}
                labelFormatter={(label) => `측정 시각 ${label}`}
              />
              <Area
                dataKey="value"
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                stroke={outside ? "#b77e3e" : "#708d66"}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <span>{points.length < 2 ? "추이 데이터 준비 중" : ""}</span>
        )}
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
