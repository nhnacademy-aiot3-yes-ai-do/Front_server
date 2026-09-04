import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("비밀번호를 제어 상태에 보관하지 않고 Spring POST 폼으로 전송한다", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const password = screen.getByLabelText("비밀번호");
    const form = password.closest("form");

    expect(password).not.toHaveAttribute("value");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/backend/login");
  });
});
