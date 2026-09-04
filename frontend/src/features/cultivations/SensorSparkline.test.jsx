import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatDateTime } from "../../utils/formatters";
import SensorSparkline from "./SensorSparkline";

vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: ({ children, data }) => (
    <div data-testid="area-chart" data-points={JSON.stringify(data)}>
      {children}
    </div>
  ),
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  XAxis: () => null,
  Tooltip: ({ formatter, labelFormatter }) => (
    <div data-testid="chart-tooltip">
      {formatter(22)[0]} · {labelFormatter("2026-09-04 12:00")}
    </div>
  ),
}));

describe("SensorSparkline tooltip", () => {
  it("시간과 단위를 포함한 측정값을 tooltip 데이터로 전달한다", () => {
    render(
      <SensorSparkline
        cultivationId={41}
        sensor={{ deviceEui: "sensor-1", deviceName: "재배 센서" }}
        sensorType={{ sensorTypeId: 1, type: "TEMPERATURE", valueUnit: "°C" }}
        latest={{ value: 22, unit: "°C" }}
        trend={[
          { measuredAt: "2026-09-04T12:00:00+09:00", value: 22 },
          { measuredAt: "2026-09-04T12:05:00+09:00", value: 23 },
        ]}
      />,
    );

    expect(screen.getByTestId("area-chart")).toHaveAttribute(
      "data-points",
      expect.stringContaining(`"measuredAt":"${formatDateTime("2026-09-04T12:00:00+09:00")}"`),
    );
    expect(screen.getByTestId("chart-tooltip")).toHaveTextContent(
      "22°C · 측정 시각 2026-09-04 12:00",
    );
  });
});
