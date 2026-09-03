import { describe, expect, it } from "vitest";
import { getPreviousDateInKorea, isDailyFeedbackDate } from "./dailyFeedbackDates";

describe("dailyFeedbackDates", () => {
  it("한국 시간 자정 직후에도 한국 날짜를 기준으로 전날을 계산한다", () => {
    expect(getPreviousDateInKorea(new Date("2026-09-03T15:30:00Z"))).toBe("2026-09-03");
    expect(getPreviousDateInKorea(new Date("2026-09-03T14:30:00Z"))).toBe("2026-09-02");
  });

  it("실제로 존재하는 ISO 날짜만 허용한다", () => {
    expect(isDailyFeedbackDate("2026-09-02")).toBe(true);
    expect(isDailyFeedbackDate("2026-02-30")).toBe(false);
    expect(isDailyFeedbackDate("09/02/2026")).toBe(false);
  });
});
