import { afterEach, describe, expect, it, vi } from "vitest";
import { gatewayRequest, gatewayUrl, request } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("Gateway 직통 요청은 Gateway URL과 인증 쿠키를 사용한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ latestSensorValuesByCultivationId: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await gatewayRequest("/api/v1/cultivations/sensor-values/latest");

    expect(gatewayUrl("/api/v1/cultivations/sensor-values/latest")).toBe(
      "http://localhost:8080/api/v1/cultivations/sensor-values/latest",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/cultivations/sensor-values/latest",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("비정상 HTTP 응답의 상태 코드와 상세 메시지를 Error에 보존한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "해당 날짜의 피드백이 없습니다." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(request("/api/cultivations/27/daily-feedbacks/2026-09-02")).rejects.toMatchObject({
      message: "해당 날짜의 피드백이 없습니다.",
      status: 404,
    });
  });
});
