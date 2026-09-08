import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as http from "../../api/http";
import FindPasswordPage from "./FindPasswordPage";

vi.mock("../../api/http", () => ({
  request: vi.fn(),
  jsonRequest: vi.fn(),
  unwrapApiResponse: vi.fn((res) => (res && Object.hasOwn(res, "data") ? res.data : res)),
  backendUrl: vi.fn((path) => path),
}));

function renderFindPasswordPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FindPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("FindPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("초기 렌더링 시 이메일 입력과 '인증번호 받기' 주 버튼이 표시된다", () => {
    vi.mocked(http.request).mockResolvedValue({});
    renderFindPasswordPage();

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    const sendButton = screen.getByRole("button", { name: "인증번호 받기" });
    expect(sendButton).toBeInTheDocument();
    expect(sendButton).toHaveClass("button--primary");
  });

  it("인증번호 발송 성공 시 타이머(3분)와 재발송 버튼이 나타난다", async () => {
    vi.mocked(http.request).mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/password-reset/email/send")) {
        return { success: true };
      }
      return {};
    });

    renderFindPasswordPage();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "인증번호 받기" }));

    expect(
      await screen.findByText("인증번호를 발송했습니다. 3분 이내에 입력해 주세요."),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("인증번호 6자리")).toBeInTheDocument();
    expect(screen.getByText("03:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "인증하고 계속" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /인증번호 재발송/ })).toBeInTheDocument();
  });

  it("인증번호 확인 성공 시 /reset-password 로 이동한다", async () => {
    vi.mocked(http.request).mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/password-reset/email/send")) {
        return { success: true };
      }
      if (typeof url === "string" && url.includes("/password-reset/verify-email")) {
        return true;
      }
      return {};
    });

    renderFindPasswordPage();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "인증번호 받기" }));

    const codeInput = await screen.findByPlaceholderText("인증번호 6자리");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "인증하고 계속" }));

    expect(http.request).toHaveBeenCalledWith(
      "/users/password-reset/verify-email",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", code: "123456" }),
      }),
    );
  });
});
