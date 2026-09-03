import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCultivationDetailPage, getLatestSensorValues } from "../../api/cultivations";
import { requiresSensorSetup } from "../../features/cultivations/cultivationSetup";
import CultivationDetailPage from "./CultivationDetailPage";

vi.mock("../../api/cultivations", () => ({
  cultivationKeys: {
    detail: (id) => ["cultivations", "detail", id],
    latest: (id) => ["cultivations", "latest", id],
  },
  getCultivationDetailPage: vi.fn(),
  getLatestSensorValues: vi.fn(),
}));

vi.mock("../../api/insights", () => ({
  getInsightCandidates: vi.fn(),
  getInsightDetail: vi.fn(),
}));

describe("CultivationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLatestSensorValues.mockResolvedValue({ latestSensorValueResponses: [] });
  });

  it("종료된 재배지는 센서가 없어도 설정 재개 대상이 아니다", () => {
    expect(requiresSensorSetup({ status: "FINISHED" }, [])).toBe(false);
    expect(requiresSensorSetup({ status: "DELETED" }, [])).toBe(false);
  });

  it("센서 설정이 끝나지 않은 재배지는 빈 대시보드 대신 이어서 설정을 안내한다", async () => {
    getCultivationDetailPage.mockResolvedValue({
      cultivation: { cultivationId: 41, name: "느타리 재배지", myRole: "OWNER" },
      sensors: { sensors: [], environmentSettings: [] },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/cultivations/41"]}>
          <Routes>
            <Route path="/cultivations/:cultivationId" element={<CultivationDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "센서 연결을 마쳐 주세요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "마저 진행하기" })).toHaveAttribute(
      "href",
      "/cultivations/41/setup",
    );
  });
});
