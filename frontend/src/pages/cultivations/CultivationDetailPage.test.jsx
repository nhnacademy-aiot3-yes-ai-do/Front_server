import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";
import CultivationDetailPage from "./CultivationDetailPage";

const mocks = vi.hoisted(() => ({
  getCultivationDetailPage: vi.fn(),
  getDailyFeedback: vi.fn(),
  getLatestSensorValues: vi.fn(),
}));

vi.mock("../../api/cultivations", () => ({
  cultivationKeys: {
    detail: (id) => ["cultivations", "detail", Number(id)],
    dailyFeedback: (id, feedbackDate) => [
      "cultivations",
      "daily-feedback",
      Number(id),
      feedbackDate,
    ],
    latest: (id) => ["cultivations", "latest", Number(id)],
    trend: (id, deviceEui, sensorType, unit) => [
      "cultivations",
      "trend",
      Number(id),
      deviceEui,
      sensorType,
      unit,
    ],
  },
  getCultivationDetailPage: mocks.getCultivationDetailPage,
  getDailyFeedback: mocks.getDailyFeedback,
  getLatestSensorValues: mocks.getLatestSensorValues,
}));

vi.mock("../../api/insights", () => ({
  getInsightCandidates: vi.fn(),
  getInsightDetail: vi.fn(),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/cultivations/46/daily-feedbacks/2026-09-02"]}>
        <Routes>
          <Route
            path="/cultivations/:cultivationId/daily-feedbacks/:feedbackDate"
            element={<CultivationDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CultivationDetailPage daily feedback deep link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("재배 상세 조회가 끝나지 않아도 일일 피드백을 먼저 조회하고 표시한다", async () => {
    mocks.getCultivationDetailPage.mockReturnValue(new Promise(() => {}));
    mocks.getDailyFeedback.mockResolvedValue({
      dailyFeedbackId: 91,
      cultivationId: 46,
      feedbackDate: "2026-09-02",
      hasVisionAnalysis: true,
      content: "환기 상태가 안정적입니다.",
      createdAt: "2026-09-03T00:05:00+09:00",
    });

    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "AI 일일 피드백" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("환기 상태가 안정적입니다.")).toBeInTheDocument();
    expect(mocks.getCultivationDetailPage).toHaveBeenCalledWith(46);
    expect(mocks.getDailyFeedback).toHaveBeenCalledWith(46, "2026-09-02");
  });
});
