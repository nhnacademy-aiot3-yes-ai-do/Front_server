import {render, screen} from "@testing-library/react";
import {MemoryRouter, Outlet, useParams} from "react-router-dom";
import {describe, expect, it, vi} from "vitest";
import App from "./App";

vi.mock("./utils/useAutoSession", () => ({
  useAutoSession: vi.fn(),
}));

vi.mock("./layouts/AppLayout", () => ({
  default: () => <Outlet />,
}));

vi.mock("./pages/cultivations/CultivationDetailPage", () => ({
  default: function MockCultivationDetailPage() {
    const { cultivationId, feedbackDate } = useParams();
    return (
      <div>
        일일 피드백 경로: {cultivationId} / {feedbackDate}
      </div>
    );
  },
}));

describe("App daily feedback route", () => {
  it("알림 딥링크의 재배지와 피드백 날짜를 상세 페이지에 전달한다", async () => {
    render(
      <MemoryRouter initialEntries={["/cultivations/27/daily-feedbacks/2026-09-02"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText("일일 피드백 경로: 27 / 2026-09-02")).toBeInTheDocument();
  });
});
