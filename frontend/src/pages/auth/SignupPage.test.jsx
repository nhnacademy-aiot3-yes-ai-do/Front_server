import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SignupPage from "./SignupPage";

describe("SignupPage", () => {
  it("비밀번호를 React 제어 상태가 아닌 브라우저 입력 요소로 받는다", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const password = screen.getByLabelText("비밀번호");
    const confirmation = screen.getByLabelText("비밀번호 확인");

    expect(password).not.toHaveAttribute("value");
    expect(confirmation).not.toHaveAttribute("value");
    expect(password).toHaveAttribute("autocomplete", "new-password");
  });
});
