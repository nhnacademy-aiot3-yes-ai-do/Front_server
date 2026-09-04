import {useEffect, useRef} from "react";
import {backendUrl} from "../api/http";

const IDLE_LIMIT_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 10 * 1000;
const REISSUE_THRESHOLD_MS = 5 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = "mush_last_active";
const ACTIVITY_RECORD_INTERVAL_MS = 1000;

function getAccessTokenExpiresAt() {
  const match = document.cookie.match(/(?:^|; )accessTokenExpiresAt=([^;]*)/);
  const raw = match ? decodeURIComponent(match[1]) : null;
  const expiresAt = Number(raw);

  return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null;
}

function submitLogout() {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = backendUrl("/users/token/logout");
  document.body.appendChild(form);
  form.submit();
}

export function useAutoSession() {
  const isLoggingOutRef = useRef(false);
  const isReissuingRef = useRef(false);
  const lastReissueExpiresAtRef = useRef(null);
  const lastRecordedAtRef = useRef(0);

  useEffect(() => {
    const logout = (message) => {
      if (isLoggingOutRef.current) return;

      isLoggingOutRef.current = true;
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);

      if (message) {
        window.alert(message);
      }

      submitLogout();
    };

    const reissue = async (expiresAt) => {
      if (isReissuingRef.current || lastReissueExpiresAtRef.current === expiresAt) return;

      isReissuingRef.current = true;
      lastReissueExpiresAtRef.current = expiresAt;

      try {
        const response = await fetch(backendUrl("/users/token/reissue"), {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          logout();
        }
      } catch {
        logout();
      } finally {
        isReissuingRef.current = false;
      }
    };

    const recordActivity = () => {
      if (document.visibilityState !== "visible") return;
      if (!getAccessTokenExpiresAt()) return;

      const now = Date.now();

      // click과 pointerdown이 연달아 와도 1초에 한 번만 저장
      if (now - lastRecordedAtRef.current < ACTIVITY_RECORD_INTERVAL_MS) return;

      lastRecordedAtRef.current = now;
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    };

    const checkSession = () => {
      const expiresAt = getAccessTokenExpiresAt();

      // 로그인하지 않은 상태라면 이전 사용자의 활동 기록도 제거
      if (!expiresAt) {
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
        return;
      }

      const now = Date.now();

      // Access Token 자체가 만료된 경우
      if (expiresAt <= now) {
        logout();
        return;
      }

      const savedLastActive = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));

      // 로그인 직후처럼 활동 기록이 없으면 현재 시각부터 시작
      if (!Number.isFinite(savedLastActive) || savedLastActive <= 0) {
        recordActivity();
        return;
      }

      if (now - savedLastActive >= IDLE_LIMIT_MS) {
        logout("1시간 동안 활동이 없어 안전하게 자동 로그아웃되었습니다.");
        return;
      }

      const remainingTime = expiresAt - now;
      if (document.visibilityState === "visible" && remainingTime <= REISSUE_THRESHOLD_MS) {
        void reissue(expiresAt);
      }
    };

    checkSession();

    window.addEventListener("click", recordActivity, { passive: true });
    window.addEventListener("keydown", recordActivity, { passive: true });
    window.addEventListener("pointerdown", recordActivity, { passive: true });

    const timer = window.setInterval(checkSession, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener("click", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("pointerdown", recordActivity);
      window.clearInterval(timer);
    };
  }, []);
}
