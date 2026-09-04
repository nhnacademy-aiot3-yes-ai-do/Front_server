import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, request } from "../../api/http";
import SensorManager from "./SensorManager";

vi.mock("../../api/http", () => ({
  jsonRequest: vi.fn(),
  request: vi.fn(),
  unwrapApiResponse: vi.fn((value) => value),
}));

vi.mock("./CultivationSensorSetupStep", () => ({
  default: ({ cultivationId, environmentSettings, onRegistered }) => (
    <section aria-label="센서 추가 양식">
      <span>
        재배지 {cultivationId} · 임계값 {environmentSettings.length}개
      </span>
      <button type="button" onClick={() => onRegistered({ deviceName: "새 온도 센서" })}>
        등록 완료
      </button>
    </section>
  ),
}));

const sensors = {
  sensors: [
    {
      sensorId: 10,
      deviceEui: "EUI-OLD",
      deviceModel: "TEMP-OLD",
      deviceName: "기존 온도 센서",
      location: "광주",
      locationDetail: "기존 선반",
      sensorTypes: [{ sensorTypeId: 1, type: "TEMPERATURE", valueUnit: "°C" }],
    },
  ],
  environmentSettings: [{ sensorTypeId: 1, thresholdMin: 18, thresholdMax: 24 }],
};

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SensorManager cultivationId={41} sensors={sensors} canManage onClose={vi.fn()} />
    </QueryClientProvider>,
  );
  return client;
}

describe("SensorManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request.mockImplementation((path) => {
      if (path === "/cultivations/sensor-types") {
        return Promise.resolve({
          sensorTypeInfoResponses: [{ id: 1, type: "TEMPERATURE", valueUnit: "°C" }],
        });
      }
      return Promise.resolve(null);
    });
    jsonRequest.mockResolvedValue(null);
  });

  it("등록된 센서와 센서 추가 화면을 탭으로 분리한다", async () => {
    renderManager();
    const registeredTab = screen.getByRole("tab", { name: "등록된 센서" });

    expect(registeredTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "등록 센서 목록" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "센서 추가 양식" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "센서 추가" }));

    expect(screen.getByRole("tab", { name: "센서 추가" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("재배지 41 · 임계값 1개")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "등록 센서 목록" })).not.toBeInTheDocument();
  });

  it("센서 등록 완료 후 데이터를 갱신하고 등록된 센서 탭으로 돌아간다", async () => {
    const client = renderManager();
    const invalidateQueries = vi.spyOn(client, "invalidateQueries").mockResolvedValue();

    fireEvent.click(screen.getByRole("tab", { name: "센서 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "등록 완료" }));

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["cultivations", "detail", 41],
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["cultivations", "preview", 41],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["cultivations", "list"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["reusable-sensors", 41] });
    expect(screen.getByRole("tab", { name: "등록된 센서" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("region", { name: "등록 센서 목록" })).toBeInTheDocument();
  });

  it("경작지 임계값은 별도 영역에서 수정한다", async () => {
    renderManager();

    const editor = await screen.findByRole("region", { name: "재배 환경 임계값" });
    const minimumInput = await within(editor).findByRole("spinbutton", { name: "온도 최소값" });
    fireEvent.change(minimumInput, {
      target: { value: "19" },
    });
    fireEvent.click(within(editor).getByRole("button", { name: "온도 임계값 저장" }));

    await waitFor(() =>
      expect(jsonRequest).toHaveBeenCalledWith("/cultivations/41/environment-settings", "PUT", {
        sensorTypeId: 1,
        thresholdMin: 19,
        thresholdMax: 24,
      }),
    );
  });
});

afterEach(cleanup);
