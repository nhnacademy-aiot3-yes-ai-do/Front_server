import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCultivationPreview } from "../../api/cultivations";
import CultivationCard from "./CultivationCard";

vi.mock("../../api/cultivations", () => ({
  cultivationKeys: { preview: (id) => ["cultivations", "preview", id] },
  getCultivationPreview: vi.fn(),
}));

function renderCard(cultivation = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CultivationCard
          cultivation={{ cultivationId: 41, name: "느타리 재배지", memberCount: 1, ...cultivation }}
          mushroomName="느타리버섯"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CultivationCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("활성 센서가 없으면 설정 필요 상태와 이어서 설정 링크를 표시한다", async () => {
    getCultivationPreview.mockResolvedValue({
      cultivation: { mode: "GROWTH", myRole: "OWNER" },
      sensors: { sensors: [], environmentSettings: [] },
      latestSensorValues: { latestSensorValueResponses: [] },
    });

    renderCard();

    expect(await screen.findByText("설정 필요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "느타리 재배지 설정 마저 진행하기" })).toHaveAttribute(
      "href",
      "/cultivations/41/setup",
    );
  });

  it("종료된 재배지는 센서가 없어도 설정 미완료로 표시하지 않는다", async () => {
    getCultivationPreview.mockResolvedValue({
      cultivation: { mode: "HARVEST", status: "FINISHED", myRole: "OWNER" },
      sensors: { sensors: [], environmentSettings: [] },
      latestSensorValues: { latestSensorValueResponses: [] },
    });

    renderCard({ status: "FINISHED" });

    expect(await screen.findByText("데이터 수집 중")).toBeInTheDocument();
    expect(screen.queryByText("설정 필요")).not.toBeInTheDocument();
    expect(screen.queryByText("마저 진행하기")).not.toBeInTheDocument();
  });
});

afterEach(cleanup);
