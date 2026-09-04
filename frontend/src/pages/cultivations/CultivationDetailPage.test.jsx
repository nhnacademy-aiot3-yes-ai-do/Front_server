import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {render, screen} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {beforeEach, describe, expect, it, vi} from "vitest";
import CultivationDetailPage from "./CultivationDetailPage";
import {requiresSensorSetup} from "../../features/cultivations/cultivationSetup";

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

describe("CultivationDetailPage sensor setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLatestSensorValues.mockResolvedValue({
      latestSensorValueResponses: [],
    });
  });

  it("종료된 재배지는 센서가 없어도 설정 재개 대상이 아니다", () => {
    expect(requiresSensorSetup({ status: "FINISHED" }, [])).toBe(false);
    expect(requiresSensorSetup({ status: "DELETED" }, [])).toBe(false);
  });

  it("센서 설정이 끝나지 않은 재배지는 빈 대시보드 대신 이어서 설정을 안내한다", async () => {
    mocks.getCultivationDetailPage.mockResolvedValue({
      cultivation: {
        cultivationId: 41,
        name: "느타리 재배지",
        myRole: "OWNER",
      },
      sensors: {
        sensors: [],
        environmentSettings: [],
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/cultivations/41"]}>
          <Routes>
            <Route path="/cultivations/:cultivationId" element={<CultivationDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "센서 연결을 마쳐 주세요",
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "마저 진행하기" })).toHaveAttribute(
      "href",
      "/cultivations/41/setup",
    );
  });
});

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
