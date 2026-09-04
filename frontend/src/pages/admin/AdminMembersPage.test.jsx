import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  forceWithdrawAdminMember,
  getAdminMembers,
  releaseDormantAdminMember,
} from "../../api/admin";
import AdminMembersPage from "./AdminMembersPage";

vi.mock("../../api/admin", () => ({
  forceWithdrawAdminMember: vi.fn(),
  getAdminMembers: vi.fn(),
  releaseDormantAdminMember: vi.fn(),
}));

const dormantMember = {
  userId: 7,
  nickname: "휴면회원",
  email: "dormant@example.com",
  createdAt: "2026-08-01T10:00:00",
  lastLoginAt: "2026-08-20T10:00:00",
};

function memberPage(content) {
  return {
    content,
    number: 0,
    totalElements: content.length,
    totalPages: 1,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AdminMembersPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getAdminMembers.mockImplementation(({ status }) =>
    Promise.resolve(memberPage(status === "dormant" ? [dormantMember] : [])),
  );
  releaseDormantAdminMember.mockResolvedValue({ success: true });
  forceWithdrawAdminMember.mockResolvedValue({ success: true });
});

describe("AdminMembersPage", () => {
  it("휴면 회원을 조회하고 확인 후 휴면 해제 API를 호출한다", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "휴면 회원" }));
    expect(await screen.findByText("dormant@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "휴면 해제" }));
    const dialog = screen.getByRole("dialog", { name: "휴면 계정 해제" });
    fireEvent.click(within(dialog).getByRole("button", { name: "휴면 해제" }));

    await waitFor(() => expect(releaseDormantAdminMember).toHaveBeenCalledWith(7));
    expect(await screen.findByText("휴면 계정을 해제했습니다.")).toBeInTheDocument();
  });
});
