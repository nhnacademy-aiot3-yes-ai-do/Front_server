import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as http from "../../api/http";
import SignupPage from "./SignupPage";

vi.mock("../../api/http", () => ({
  request: vi.fn(),
  jsonRequest: vi.fn(),
  unwrapApiResponse: vi.fn((res) => (res && Object.hasOwn(res, "data") ? res.data : res)),
  backendUrl: vi.fn((path) => path),
}));

function renderSignupPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("비밀번호를 React 제어 상태가 아닌 브라우저 입력 요소로 받는다", () => {
    renderSignupPage();

    const password = screen.getByLabelText("비밀번호");
    const confirmation = screen.getByLabelText("비밀번호 확인");

    expect(password).not.toHaveAttribute("value");
    expect(confirmation).not.toHaveAttribute("value");
    expect(password).toHaveAttribute("autocomplete", "new-password");
  });

  it("이메일 인증번호 발송 성공 시 '인증번호가 발송되었습니다.' 알림을 표시한다", async () => {
    vi.mocked(http.request).mockResolvedValue({ success: true });
    renderSignupPage();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const sendBtn = screen.getByRole("button", { name: "이메일 인증" });
    fireEvent.click(sendBtn);

    expect(await screen.findByText("인증번호가 발송되었습니다.")).toBeInTheDocument();
    expect(http.request).toHaveBeenCalledWith(
      "/users/email/send",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("닉네임 중복 확인 시 사용 가능한 닉네임(false)이면 '사용할 수 있는 닉네임입니다.'를 표시한다", async () => {
    // 1단계 통과 처리 (이메일 인증 완료)
    vi.mocked(http.request).mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/users/check-nickname")) {
        return false; // 중복 아님 = 사용 가능
      }
      return { verified: true };
    });

    renderSignupPage();

    // 이메일 입력 및 인증
    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "이메일 인증" }));

    const codeInput = await screen.findByPlaceholderText("인증번호 6자리");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "인증확인" }));
    await screen.findByText("이메일 인증이 완료되었습니다.");

    // 비밀번호 입력 후 다음 단계로
    const password = screen.getByLabelText("비밀번호");
    const confirmation = screen.getByLabelText("비밀번호 확인");
    fireEvent.change(password, { target: { value: "Password123!" } });
    fireEvent.change(confirmation, { target: { value: "Password123!" } });

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    // 2단계: 닉네임 입력 및 중복 확인
    const nicknameInput = await screen.findByPlaceholderText("닉네임");
    fireEvent.change(nicknameInput, { target: { value: "새닉네임" } });
    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));

    expect(await screen.findByText("사용할 수 있는 닉네임입니다.")).toBeInTheDocument();
  });

  it("닉네임 중복 확인 시 이미 사용 중인 닉네임(true)이면 '이미 사용 중인 닉네임입니다.'를 표시한다", async () => {
    vi.mocked(http.request).mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("/users/check-nickname")) {
        return true; // 중복 = 사용 불가
      }
      return { verified: true };
    });

    renderSignupPage();

    // 이메일 및 비밀번호 입력 후 2단계로
    const emailInput = screen.getByPlaceholderText("you@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "이메일 인증" }));

    const codeInput = await screen.findByPlaceholderText("인증번호 6자리");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "인증확인" }));
    await screen.findByText("이메일 인증이 완료되었습니다.");

    const password = screen.getByLabelText("비밀번호");
    const confirmation = screen.getByLabelText("비밀번호 확인");
    fireEvent.change(password, { target: { value: "Password123!" } });
    fireEvent.change(confirmation, { target: { value: "Password123!" } });

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    // 2단계: 닉네임 입력 및 중복 확인
    const nicknameInput = await screen.findByPlaceholderText("닉네임");
    fireEvent.change(nicknameInput, { target: { value: "기존닉네임" } });
    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));

    expect(await screen.findByText("이미 사용 중인 닉네임입니다.")).toBeInTheDocument();
  });
});
