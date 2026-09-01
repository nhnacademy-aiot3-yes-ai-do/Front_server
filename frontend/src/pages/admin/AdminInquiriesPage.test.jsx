import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  answerAdminInquiry,
  deleteAdminInquiryCultivation,
  getAdminInquiries,
  getAdminInquiry,
} from "../../api/admin";
import AdminInquiriesPage from "./AdminInquiriesPage";

vi.mock("../../api/admin", () => ({
  answerAdminInquiry: vi.fn(),
  deleteAdminInquiryCultivation: vi.fn(),
  getAdminInquiries: vi.fn(),
  getAdminInquiry: vi.fn(),
}));

const inquiry = {
  id: 3,
  categoryName: "재배지",
  title: "재배지 삭제 요청",
  userNickname: "문의회원",
  createdAt: "2026-09-01T10:00:00",
  status: "PENDING",
  cultivationId: 10,
  cultivationName: "테스트 재배지",
  messages: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin/inquiries?open=3"]}>
        <AdminInquiriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getAdminInquiries.mockResolvedValue({
    content: [inquiry],
    number: 0,
    totalElements: 1,
    totalPages: 1,
  });
  getAdminInquiry.mockResolvedValue(inquiry);
  deleteAdminInquiryCultivation.mockResolvedValue({ success: true });
  answerAdminInquiry.mockResolvedValue({ success: true });
});

describe("AdminInquiriesPage", () => {
  it("문의에 연결된 재배지를 확인 후 DELETE 요청한다", async () => {
    renderPage();

    expect(await screen.findByText("재배지: 테스트 재배지")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "재배지 삭제" }));

    const confirmation = screen.getByRole("alert");
    fireEvent.click(within(confirmation).getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(deleteAdminInquiryCultivation).toHaveBeenCalledWith(10));
    expect(await screen.findByText("문의에 연결된 재배지를 삭제했습니다.")).toBeInTheDocument();
  });
});
