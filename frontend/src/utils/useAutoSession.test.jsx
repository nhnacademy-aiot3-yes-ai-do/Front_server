import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backendUrl } from "../api/http";
import { useAutoSession } from "./useAutoSession";

const ACTIVITY_STORAGE_KEY = "mush_last_active";
const ONE_HOUR_MS = 60 * 60 * 1000;

function AutoSessionHarness() {
  useAutoSession();
  return null;
}

function setAccessTokenExpiresAt(expiresAt) {
  document.cookie = `accessTokenExpiresAt=${expiresAt}; path=/`;
}

function clearAccessTokenExpiresAt() {
  document.cookie = "accessTokenExpiresAt=; Max-Age=0; path=/";
}

function setVisibilityState(value) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
}

describe("useAutoSession", () => {
  let submitSpy;
  let storage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    storage = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
      clear: () => storage.clear(),
    });
    vi.stubGlobal("fetch", vi.fn());
    setVisibilityState("visible");
    clearAccessTokenExpiresAt();
    submitSpy = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    storage.clear();
    clearAccessTokenExpiresAt();
  });

  it("로그인 토큰이 없으면 이전 활동 기록을 지운다", () => {
    storage.set(ACTIVITY_STORAGE_KEY, "stale-value");

    render(<AutoSessionHarness />);

    expect(storage.get(ACTIVITY_STORAGE_KEY)).toBeUndefined();
  });

  it("로그인 상태에서 클릭 또는 키 입력이 있으면 활동 시각을 기록한다", () => {
    const now = Date.now();
    setAccessTokenExpiresAt(now + ONE_HOUR_MS);

    render(<AutoSessionHarness />);
    expect(storage.get(ACTIVITY_STORAGE_KEY)).toBe(String(now));

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.keyDown(window, { key: "Tab" });

    expect(storage.get(ACTIVITY_STORAGE_KEY)).toBe(String(Date.now()));
  });

  it("스크롤만으로는 활동 시각을 갱신하지 않는다", () => {
    const now = Date.now();
    setAccessTokenExpiresAt(now + ONE_HOUR_MS);
    render(<AutoSessionHarness />);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.scroll(window);

    expect(storage.get(ACTIVITY_STORAGE_KEY)).toBe(String(now));
  });

  it("만료 5분 전이고 화면을 보고 있으면 토큰을 한 번 자동 재발급한다", () => {
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000;
    vi.mocked(fetch).mockResolvedValue({ ok: true });
    setAccessTokenExpiresAt(expiresAt);
    storage.set(ACTIVITY_STORAGE_KEY, String(now));

    render(<AutoSessionHarness />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(backendUrl("/users/token/reissue"), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("다른 탭에 있으면 만료가 가까워도 자동 재발급하지 않는다", () => {
    const now = Date.now();
    vi.mocked(fetch).mockResolvedValue({ ok: true });
    setVisibilityState("hidden");
    setAccessTokenExpiresAt(now + 5 * 60 * 1000);
    storage.set(ACTIVITY_STORAGE_KEY, String(now));

    render(<AutoSessionHarness />);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("자동 재발급에 실패하면 로그아웃한다", async () => {
    const now = Date.now();
    vi.mocked(fetch).mockResolvedValue({ ok: false });
    setAccessTokenExpiresAt(now + 5 * 60 * 1000);
    storage.set(ACTIVITY_STORAGE_KEY, String(now));

    render(<AutoSessionHarness />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(submitSpy).toHaveBeenCalledOnce();
    expect(storage.get(ACTIVITY_STORAGE_KEY)).toBeUndefined();
  });

  it("만료된 Access Token이면 즉시 로그아웃 폼을 한 번만 전송한다", () => {
    storage.set(ACTIVITY_STORAGE_KEY, String(Date.now()));
    setAccessTokenExpiresAt(Date.now() - 1);

    render(<AutoSessionHarness />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(submitSpy).toHaveBeenCalledOnce();
    expect(storage.get(ACTIVITY_STORAGE_KEY)).toBeUndefined();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it("1시간 동안 활동이 없으면 안내 후 로그아웃한다", () => {
    const now = Date.now();
    setAccessTokenExpiresAt(now + ONE_HOUR_MS + 10_000);
    storage.set(ACTIVITY_STORAGE_KEY, String(now));

    render(<AutoSessionHarness />);
    act(() => {
      vi.advanceTimersByTime(ONE_HOUR_MS);
    });

    expect(window.alert).toHaveBeenCalledWith(
      "1시간 동안 활동이 없어 안전하게 자동 로그아웃되었습니다.",
    );
    expect(submitSpy).toHaveBeenCalledOnce();
    expect(storage.get(ACTIVITY_STORAGE_KEY)).toBeUndefined();
  });

  it("컴포넌트가 사라지면 타이머를 정리해 자동 로그아웃하지 않는다", () => {
    const now = Date.now();
    setAccessTokenExpiresAt(now + 5_000);

    const { unmount } = render(<AutoSessionHarness />);
    unmount();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(submitSpy).not.toHaveBeenCalled();
  });
});
