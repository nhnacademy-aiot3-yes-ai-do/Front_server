import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  default: ({ cultivation, latestSensorValues }) => (
    <div data-testid={`card-${cultivation.cultivationId}`}>
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
      latestSensorValuesByCultivationId: { 41: [{ sensorType: "temperature", value: 22 }] },
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
    await waitFor(() => expect(mocks.getLatestSensorValuesForCultivations).toHaveBeenCalledTimes(1));

    const latestQuery = queryClient.getQueryCache().find({
      queryKey: ["cultivations", "latest-batch"],
    });
    expect(latestQuery.options.refetchInterval).toBe(3000);
  });
});
