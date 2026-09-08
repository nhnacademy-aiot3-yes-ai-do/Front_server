import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CultivationListPage from "./CultivationListPage";

const mocks = vi.hoisted(() => ({
  getCultivationListPage: vi.fn(),
  getLatestSensorValuesForCultivations: vi.fn(),
}));

vi.mock("../../api/cultivations", () => ({
  cultivationKeys: {
    list: () => ["cultivations", "list"],
    latestBatch: () => ["cultivations", "latest-batch"],
  },
  getCultivationListPage: mocks.getCultivationListPage,
  getLatestSensorValuesForCultivations: mocks.getLatestSensorValuesForCultivations,
}));

vi.mock("../../features/cultivations/CultivationCard", () => ({
  default: ({ cultivation, mushroomName, latestSensorValues, sensorTrend1h }) => (
    <div
      data-testid={`card-${cultivation.cultivationId}`}
      data-trend-points={sensorTrend1h?.length ?? 0}
    >
      <span>{cultivation.name}</span>
      <span>{mushroomName}</span>
      {JSON.stringify(latestSensorValues)}
    </div>
  ),
}));

vi.mock("../../components/admin/AdminPagination", () => ({
  default: () => null,
}));

describe("CultivationListPage realtime latest polling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCultivationListPage.mockResolvedValue({
      cultivations: [{ cultivationId: 41, mushroomId: 1 }],
      mushrooms: [{ id: 1, mushroomNameKo: "느타리" }],
    });
    mocks.getLatestSensorValuesForCultivations.mockResolvedValue({
      latestSensorValuesByCultivationId: {
        41: [
          {
            deviceEui: "sensor-1",
            sensorType: "temperature",
            unit: "°C",
            value: 22,
            measuredAt: "2026-09-08T00:00:00Z",
          },
        ],
      },
    });
  });

  it("한 번의 Gateway batch query를 3초 주기로 사용해 카드 값을 갱신한다", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CultivationListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("card-41")).toHaveTextContent('"value":22'));
    await waitFor(() =>
      expect(mocks.getLatestSensorValuesForCultivations).toHaveBeenCalledTimes(1),
    );

    const latestQuery = queryClient.getQueryCache().find({
      queryKey: ["cultivations", "latest-batch"],
    });
    expect(latestQuery.options.refetchInterval).toBe(3000);
  });

  it("3초 polling으로 들어온 최신 측정값을 목록 그래프 trend에 누적한다", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CultivationListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const card = await screen.findByTestId("card-41");
    await waitFor(() => expect(card).toHaveAttribute("data-trend-points", "1"));

    act(() => {
      queryClient.setQueryData(["cultivations", "latest-batch"], {
        latestSensorValuesByCultivationId: {
          41: [
            {
              deviceEui: "sensor-1",
              sensorType: "temperature",
              unit: "°C",
              value: 23,
              measuredAt: "2026-09-08T00:00:03Z",
            },
          ],
        },
      });
    });
    await waitFor(() => expect(card).toHaveAttribute("data-trend-points", "2"));
  });

  it("재배지 이름과 버섯 종류로 목록을 필터링하고 결과가 없으면 빈 상태를 표시한다", async () => {
    mocks.getCultivationListPage.mockResolvedValue({
      cultivations: [
        { cultivationId: 41, name: "느타리 재배지", mushroomId: 1 },
        { cultivationId: 42, name: "양송이 재배지", mushroomId: 2 },
      ],
      mushrooms: [
        { id: 1, mushroomNameKo: "느타리버섯" },
        { id: 2, mushroomNameKo: "새송이버섯" },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CultivationListPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const searchInput = await screen.findByRole("searchbox", { name: "재배지 검색" });
    expect(screen.getByTestId("card-41")).toBeInTheDocument();
    expect(screen.getByTestId("card-42")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "양송이" } });
    expect(screen.queryByTestId("card-41")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-42")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "새송이" } });
    expect(screen.queryByTestId("card-41")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-42")).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "없는 재배지" } });
    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "검색어 지우기" })).toBeInTheDocument();
  });
});

afterEach(cleanup);
