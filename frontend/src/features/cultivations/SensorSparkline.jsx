import { useRef } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatDateTime, formatSensorType, normalizeSensorUnit } from "../../utils/formatters";

function SensorTooltipContent({ active, coordinate, label, payload, chartRef, unit }) {
  if (!active || !payload?.length || !coordinate || !chartRef.current) return null;

  const chartRect = chartRef.current.getBoundingClientRect();
  const left = Math.min(Math.max(chartRect.left + coordinate.x + 10, 8), window.innerWidth - 188);
  const top = Math.max(chartRect.top + coordinate.y - 8, 8);

  return (
    <div className="sensor-spark__tooltip-content" style={{ left, top }}>
      <div>{`측정 시각 ${label}`}</div>
      <strong>{`${payload[0].value}${unit || ""}`}</strong>
    </div>
  );
}

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
  const chartRef = useRef(null);

  return (
    <article className={`sensor-spark ${outside ? "sensor-spark--warning" : ""}`}>
      <div className="sensor-spark__top">
        <div className="sensor-spark__title">
          <span>{formatSensorType(sensorType.type)}</span>
          <strong>
            {value ?? "-"}
            <small>{unit || ""}</small>
          </strong>
        </div>
        <span className="sensor-spark__state">
          {value == null
            ? "수집 중"
            : !hasThreshold
              ? "범위 미등록"
              : outside
                ? "확인 필요"
                : "안정"}
        </span>
      </div>
      <div
        className="sensor-spark__chart"
        ref={chartRef}
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
                allowEscapeViewBox={{ x: true, y: true }}
                content={(tooltipProps) => (
                  <SensorTooltipContent {...tooltipProps} chartRef={chartRef} unit={unit} />
                )}
                portal={typeof document !== "undefined" ? document.body : undefined}
                wrapperStyle={{
                  height: 0,
                  left: 0,
                  overflow: "visible",
                  pointerEvents: "none",
                  position: "fixed",
                  top: 0,
                  width: 0,
                  zIndex: 1000,
                }}
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
