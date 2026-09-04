import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCultivation, getCultivationSetupPage } from "../../api/cultivations";
import CultivationSensorSetupPage from "./CultivationSensorSetupPage";

vi.mock("../../api/cultivations", () => ({
  cultivationKeys: {
    all: ["cultivations"],
    setup: (id) => ["cultivations", "setup", id],
    detail: (id) => ["cultivations", "detail", id],
    preview: (id) => ["cultivations", "preview", id],
    list: () => ["cultivations", "list"],
  },
  deleteCultivation: vi.fn(),
  getCultivationSetupPage: vi.fn(),
}));

vi.mock("../../features/cultivations/CultivationSensorSetupStep", () => ({
  default: ({ environmentSettings, onRegistered }) => (
    <div>
      센서 설정 폼 · 임계값 {environmentSettings.length}개
      <button
        type="button"
        onClick={() =>
          onRegistered({
            deviceEui: "EUI-NEW-001",
            deviceName: "새 온도 센서",
          })
        }
      >
        테스트 센서 등록
      </button>
    </div>
  ),
}));

describe("CultivationSensorSetupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteCultivation.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("저장된 재배지와 환경 설정으로 센서 연결 단계를 복원한다", async () => {
    getCultivationSetupPage.mockResolvedValue({
      cultivation: { cultivationId: 41, name: "느타리 재배지" },
      sensors: {
        sensors: [],
        environmentSettings: [
          { sensorTypeId: 1, thresholdMin: 18, thresholdMax: 24 },
          { sensorTypeId: 2, thresholdMin: 80, thresholdMax: 90 },
        ],
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/cultivations/41/setup"]}>
          <Routes>
            <Route
              path="/cultivations/:cultivationId/setup"
              element={<CultivationSensorSetupPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("느타리 재배지가 생성되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("센서 설정 폼 · 임계값 2개")).toBeInTheDocument();
    expect(
      screen.getByText("센서 등록", { selector: ".creation-stepper__step span:last-child" }),
    ).toBeInTheDocument();
  });

  it("경작지 기본정보가 누락되면 빈 화면 대신 오류 상태를 표시한다", async () => {
    getCultivationSetupPage.mockResolvedValue({
      cultivation: null,
      sensors: { sensors: [], environmentSettings: [] },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/cultivations/41/setup"]}>
          <Routes>
            <Route
              path="/cultivations/:cultivationId/setup"
              element={<CultivationSensorSetupPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("재배지 정보를 불러오지 못했습니다.")).toBeInTheDocument();
  });

  it("센서 등록 직후 설정과 재배지 화면 캐시를 갱신한다", async () => {
    getCultivationSetupPage.mockResolvedValue({
      cultivation: { cultivationId: 41, name: "느타리 재배지" },
      sensors: {
        sensors: [],
        environmentSettings: [{ sensorTypeId: 1, thresholdMin: 18, thresholdMax: 24 }],
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(client, "invalidateQueries").mockResolvedValue();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/cultivations/41/setup"]}>
          <Routes>
            <Route
              path="/cultivations/:cultivationId/setup"
              element={<CultivationSensorSetupPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "테스트 센서 등록" }));

    expect(await screen.findByText("새 온도 센서")).toBeInTheDocument();
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["cultivations", "setup", 41],
      }),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["cultivations", "detail", 41],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["cultivations", "preview", 41],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["cultivations", "list"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["reusable-sensors", 41] });
  });

  it("소유자는 설정 중인 재배지를 확인 후 삭제하고 목록으로 이동한다", async () => {
    getCultivationSetupPage.mockResolvedValue({
      cultivation: {
        cultivationId: 41,
        name: "느타리 재배지",
        myRole: "OWNER",
      },
      sensors: { sensors: [], environmentSettings: [] },
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/cultivations/41/setup"]}>
          <Routes>
            <Route
              path="/cultivations/:cultivationId/setup"
              element={<CultivationSensorSetupPage />}
            />
            <Route path="/cultivations" element={<div>재배지 목록 화면</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "재배지 삭제" }));

    expect(confirm).toHaveBeenCalledWith(
      "재배지와 연결된 정보를 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
    );
    await waitFor(() => expect(deleteCultivation).toHaveBeenCalledWith(41));
    expect(await screen.findByText("재배지 목록 화면")).toBeInTheDocument();
  });
});
