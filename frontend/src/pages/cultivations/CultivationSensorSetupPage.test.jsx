import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {getCultivationSetupPage} from "../../api/cultivations";
import CultivationSensorSetupPage from "./CultivationSensorSetupPage";

vi.mock("../../api/cultivations", () => ({
  cultivationKeys: { setup: (id) => ["cultivations", "setup", id] },
  getCultivationSetupPage: vi.fn(),
}));

vi.mock("../../features/cultivations/CultivationSensorSetupStep", () => ({
  default: ({ environmentSettings }) => (
    <div>센서 설정 폼 · 임계값 {environmentSettings.length}개</div>
  ),
}));

describe("CultivationSensorSetupPage", () => {
  beforeEach(() => vi.clearAllMocks());

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
});
