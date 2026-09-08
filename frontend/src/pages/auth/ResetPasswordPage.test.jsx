import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as http from "../../api/http";
import ResetPasswordPage from "./ResetPasswordPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api/http", () => ({
  request: vi.fn(),
  jsonRequest: vi.fn(),
  unwrapApiResponse: vi.fn((res) => (res && Object.hasOwn(res, "data") ? res.data : res)),
  backendUrl: vi.fn((path) => path),
}));

function renderResetPasswordPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("인증된 이메일이 없으면 /find-password 로 리다이렉트된다", async () => {
    vi.mocked(http.request).mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/password-reset/verified-email")) {
        return { success: true, data: null };
      }
      return {};
    });

    renderResetPasswordPage();

    expect(await screen.findByText("인증 상태 확인 중…")).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/find-password", { replace: true });
  });

  it("인증된 이메일이 있으면 해당 계정 안내 문구와 변경 폼이 렌더링된다", async () => {
    vi.mocked(http.request).mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/password-reset/verified-email")) {
        return { success: true, data: "user@example.com" };
      }
      return {};
    });

    renderResetPasswordPage();

    expect(await screen.findByText(/user@example\.com/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("새 비밀번호")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("새 비밀번호 확인")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "비밀번호 변경" })).toBeInTheDocument();
  });

  it("비밀번호와 확인이 다르면 폼 제출을 중단하고 오류 메시지를 표시한다", async () => {
    vi.mocked(http.request).mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/password-reset/verified-email")) {
        return { success: true, data: "user@example.com" };
      }
      return {};
    });

    renderResetPasswordPage();

    const newPass = await screen.findByPlaceholderText("새 비밀번호");
    const confirmPass = screen.getByPlaceholderText("새 비밀번호 확인");
    fireEvent.change(newPass, { target: { value: "Password123!" } });
    fireEvent.change(confirmPass, { target: { value: "Different123!" } });

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));

    expect(await screen.findByText("비밀번호가 일치하지 않습니다.")).toBeInTheDocument();
  });
});
