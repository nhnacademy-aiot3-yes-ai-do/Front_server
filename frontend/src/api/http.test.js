import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
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
