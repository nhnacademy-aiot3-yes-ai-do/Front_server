import {useQuery} from "@tanstack/react-query";
import {Bell, ChevronDown, CircleUserRound, Clock3, History, LogOut, MessageSquare, User,} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {backendUrl, request, unwrapApiResponse} from "../api/http";

function readCookie(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function remainingSessionSeconds() {
  const expiresAt = Number(readCookie("accessTokenExpiresAt"));
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

function useSessionTimer() {
  const [remainingSeconds, setRemainingSeconds] = useState(remainingSessionSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => setRemainingSeconds(remainingSessionSeconds()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (remainingSeconds == null) return { label: "--:--", remainingSeconds: null };
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  return { label: `${minutes}:${seconds}`, remainingSeconds };
}

export default function AppHeader() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [extending, setExtending] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const profileRef = useRef(null);
  const logoutFormRef = useRef(null);
  const session = useSessionTimer();
  const profileQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: () => request("/users/mypage").then(unwrapApiResponse),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    const close = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (session.remainingSeconds === 0) logoutFormRef.current?.requestSubmit();
  }, [session.remainingSeconds]);

  const extendSession = async () => {
    if (extending) return;
    setExtending(true);
    setSessionError("");
    try {
      await request("/users/token/reissue", { method: "POST" }).then(unwrapApiResponse);
      window.location.reload();
    } catch {
      setSessionError("로그인 연장에 실패했습니다. 다시 로그인해 주세요.");
      window.setTimeout(() => logoutFormRef.current?.requestSubmit(), 1_500);
    }
  };

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link className="app-logo" to="/cultivations" aria-label="MushMush 재배지 목록">
          <img src="/images/logo2.png" alt="MushMush" />
        </Link>
        <nav className="app-header__actions" aria-label="사용자 메뉴">
          <Link className="header-link" to="/cultivations/history">
            <History aria-hidden="true" />
            <span>재배 이력</span>
          </Link>
          <Link className="header-link" to="/support">
            <MessageSquare aria-hidden="true" />
            <span>회원문의</span>
          </Link>
          <div className="session-pill">
            <Clock3 aria-hidden="true" />
            <span>{session.label}</span>
            {session.remainingSeconds != null && session.remainingSeconds <= 600 && (
              <button type="button" onClick={extendSession} disabled={extending}>
                {extending ? "연장 중…" : "연장"}
              </button>
            )}
          </div>
          <div className="profile-menu" ref={profileRef}>
            <button
              className="profile-menu__trigger"
              type="button"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="avatar">
                {profileQuery.data?.photoUrl ? (
                  <img src={profileQuery.data.photoUrl} alt="" />
                ) : (
                  <CircleUserRound aria-hidden="true" />
                )}
              </span>
              <span>{profileQuery.data?.nickname || "사용자"}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {profileOpen && (
              <div className="profile-menu__panel">
                <Link to="/mypage">
                  <User aria-hidden="true" /> 내 정보 보기
                </Link>
                <Link to="/mypage/notifications">
                  <Bell aria-hidden="true" /> 알림 설정
                </Link>
                <button type="button" onClick={() => logoutFormRef.current?.requestSubmit()}>
                  <LogOut aria-hidden="true" /> 로그아웃
                </button>
              </div>
            )}
          </div>
        </nav>
        <form
          ref={logoutFormRef}
          className="sr-only"
          method="post"
          action={backendUrl("/users/token/logout")}
          aria-hidden="true"
        />
      </div>
      {sessionError && (
        <div className="header-notice" role="alert">
          {sessionError}
        </div>
      )}
    </header>
  );
}
