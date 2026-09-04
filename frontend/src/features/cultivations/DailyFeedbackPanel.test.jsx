import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {getDailyFeedback} from "../../api/cultivations";
import DailyFeedbackPanel from "./DailyFeedbackPanel";

vi.mock("../../api/cultivations", () => ({
  cultivationKeys: {
    dailyFeedback: (id, feedbackDate) => ["cultivations", "daily-feedback", id, feedbackDate],
  },
  getDailyFeedback: vi.fn(),
}));

const feedback = {
  dailyFeedbackId: 91,
  cultivationId: 27,
  feedbackDate: "2026-09-02",
  hasVisionAnalysis: true,
  content: "온도와 습도가 안정적입니다.\n현재 환기 주기를 유지해 주세요.",
  createdAt: "2026-09-03T00:06:00",
};

function renderPanel(overrides = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
        retryDelay: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DailyFeedbackPanel
        cultivationId={27}
        cultivationName="느타리 재배지"
        feedbackDate="2026-09-02"
        minDate="2026-08-01"
        maxDate="2026-09-02"
        {...overrides}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("DailyFeedbackPanel", () => {
  it("선택한 날짜의 피드백 전문과 사진 분석 여부를 표시한다", async () => {
    getDailyFeedback.mockResolvedValue(feedback);

    renderPanel();

    expect(await screen.findByText(/온도와 습도가 안정적입니다/)).toBeInTheDocument();
    expect(screen.getByText("사진 분석 포함")).toBeInTheDocument();
    expect(screen.getByLabelText("일일 피드백 조회 날짜")).toHaveValue("2026-09-02");
    expect(getDailyFeedback).toHaveBeenCalledWith(27, "2026-09-02");
  });

  it("404 응답은 서비스 장애가 아니라 피드백이 없는 상태로 표시한다", async () => {
    const notFound = Object.assign(new Error("피드백을 찾을 수 없습니다."), { status: 404 });
    getDailyFeedback.mockRejectedValue(notFound);

    renderPanel();

    expect(
      await screen.findByText("이 날짜에는 생성된 일일 피드백이 없습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText("피드백을 찾을 수 없습니다.")).not.toBeInTheDocument();
    expect(getDailyFeedback).toHaveBeenCalledTimes(1);
  });

  it("일시적인 오류가 발생하면 다시 시도해 피드백을 표시한다", async () => {
    const unavailable = Object.assign(new Error("AI 서비스 연결이 원활하지 않습니다."), {
      status: 503,
    });
    getDailyFeedback.mockRejectedValue(unavailable);

    renderPanel();

    expect(await screen.findByText(unavailable.message)).toBeInTheDocument();
    await waitFor(() => expect(getDailyFeedback).toHaveBeenCalledTimes(2));

    getDailyFeedback.mockResolvedValue(feedback);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText(/현재 환기 주기를 유지해 주세요/)).toBeInTheDocument();
    expect(getDailyFeedback).toHaveBeenCalledTimes(3);
  });
});
