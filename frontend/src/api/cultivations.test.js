import { afterEach, describe, expect, it, vi } from "vitest";
import { getLatestSensorValues, getLatestSensorValuesForCultivations } from "./cultivations";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cultivation sensor latest API", () => {
  it("목록 batch latest는 Gateway collection endpoint를 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ latestSensorValuesByCultivationId: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getLatestSensorValuesForCultivations();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/cultivations/sensor-values/latest",
      expect.any(Object),
    );
  });

  it("상세 latest도 Gateway identifier endpoint를 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ latestSensorValueResponses: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getLatestSensorValues(41);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/cultivations/41/sensor-values",
      expect.any(Object),
    );
  });
});
