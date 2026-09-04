import {describe, expect, it} from "vitest";
import {formatMode, formatRole, formatSensorType, normalizeList} from "./formatters";

describe("formatters", () => {
  it("서버 enum을 사용자에게 보이는 한국어로 변환한다", () => {
    expect(formatMode("HARVEST")).toBe("수확 모드");
    expect(formatRole("OWNER")).toBe("소유자");
    expect(formatSensorType("CO2")).toBe("CO₂");
  });

  it("목록이 아닌 응답을 안전한 빈 목록으로 바꾼다", () => {
    expect(normalizeList(null)).toEqual([]);
    expect(normalizeList({ content: [] })).toEqual([]);
  });
});
