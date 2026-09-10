import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, request } from "../../api/http";
import CultivationActions from "./CultivationActions";

vi.mock("../../api/http", () => ({ jsonRequest: vi.fn(), request: vi.fn() }));

function renderActions() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/cultivations/41"]}>
        <Routes>
          <Route
            path="/cultivations/41"
            element={
              <CultivationActions
                cultivation={{ cultivationId: 41, myRole: "OWNER", mode: "HARVEST" }}
                growthDays={10}
                pastCultivations={[]}
                onClose={vi.fn()}
              />
            }
          />
          <Route path="/cultivations" element={<div>재배지 목록 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return invalidateQueries;
}

describe("CultivationActions reusable sensors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request.mockResolvedValue(null);
    jsonRequest.mockResolvedValue({ harvestWeight: 100 });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("재배 종료가 성공하면 전체 재사용 목록을 갱신한다", async () => {
    const invalidateQueries = renderActions();
    fireEvent.click(screen.getByRole("button", { name: "수확 기록 후 재배 종료" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "최종 수확량 (g)" }), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "수확량 기록" }));

    expect(await screen.findByText("최종 수확량을 기록했습니다.")).toBeInTheDocument();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["reusable-sensors"] });
  });

  it("재배지 삭제가 성공하면 전체 재사용 목록을 갱신한다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const invalidateQueries = renderActions();
    fireEvent.click(screen.getByRole("button", { name: "재배지 삭제" }));

    expect(await screen.findByText("재배지 목록 화면")).toBeInTheDocument();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["reusable-sensors"] });
  });

  it("재배지 삭제 실패를 사용 해제로 처리하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    request.mockRejectedValueOnce(new Error("삭제 실패"));
    const invalidateQueries = renderActions();
    fireEvent.click(screen.getByRole("button", { name: "재배지 삭제" }));

    await waitFor(() => expect(screen.getByText("삭제 실패")).toBeInTheDocument());
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
