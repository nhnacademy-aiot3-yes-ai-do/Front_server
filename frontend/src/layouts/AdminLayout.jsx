import {Bell, Clock3, Cpu, LayoutDashboard, LogOut, Menu, MessageSquare, Package, Users, X,} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {NavLink, Outlet} from "react-router-dom";
import {backendUrl, request} from "../api/http";

const navigation = [
  { to: "/admin", label: "대시보드", icon: LayoutDashboard, end: true },
  { to: "/admin/members", label: "회원 관리", icon: Users },
  { to: "/admin/inquiries", label: "회원 문의", icon: MessageSquare },
  { to: "/admin/mushrooms", label: "버섯 기준정보", icon: Package },
  { to: "/admin/sensors", label: "센서 타입", icon: Cpu },
  { to: "/admin/notification-events", label: "알림 관리", icon: Bell },
];

function readCookie(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function getRemainingSeconds() {
  const expiresAt = Number(readCookie("accessTokenExpiresAt"));
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

function useAdminSession() {
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => setRemainingSeconds(getRemainingSeconds()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (remainingSeconds == null) return { label: "--:--", remainingSeconds: null };
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  return { label: `${minutes}:${seconds}`, remainingSeconds };
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [extending, setExtending] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const logoutFormRef = useRef(null);
  const session = useAdminSession();

  useEffect(() => {
    if (session.remainingSeconds === 0) logoutFormRef.current?.requestSubmit();
  }, [session.remainingSeconds]);

  const extendSession = async () => {
    if (extending) return;
    setExtending(true);
    setSessionError("");
    try {
      await request("/users/token/reissue", { method: "POST" });
      window.location.reload();
    } catch {
      setSessionError("로그인 연장에 실패했습니다. 다시 로그인해 주세요.");
    } finally {
      setExtending(false);
    }
  };

  return (
    <div className="admin-app">
      <button
        className="admin-mobile-menu"
        type="button"
        aria-label={mobileOpen ? "관리자 메뉴 닫기" : "관리자 메뉴 열기"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      {mobileOpen && (
        <button
          className="admin-sidebar-backdrop"
          type="button"
          aria-label="관리자 메뉴 닫기"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`admin-sidebar${mobileOpen ? " is-open" : ""}`}>
        <NavLink className="admin-brand" to="/admin" onClick={() => setMobileOpen(false)}>
          <img src="/images/logo2.png" alt="MushMush" />
          <span>Admin</span>
        </NavLink>
        <p className="admin-nav-label">관리자 메뉴</p>
        <nav aria-label="관리자 메뉴">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
              onClick={() => setMobileOpen(false)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <div className="admin-session">
            <Clock3 aria-hidden="true" />
            <span>{session.label}</span>
            {session.remainingSeconds != null && session.remainingSeconds <= 600 && (
              <button type="button" onClick={extendSession} disabled={extending}>
                {extending ? "연장 중" : "연장"}
              </button>
            )}
          </div>
          <div className="admin-profile">
            <span aria-hidden="true">관</span>
            <div>
              <strong>관리자</strong>
              <small>MushMush 운영</small>
            </div>
          </div>
          <button
            className="admin-logout"
            type="button"
            onClick={() => logoutFormRef.current?.requestSubmit()}
          >
            <LogOut aria-hidden="true" />
            로그아웃
          </button>
          {sessionError && <p className="admin-session-error">{sessionError}</p>}
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
      <form
        ref={logoutFormRef}
        className="sr-only"
        method="post"
        action={backendUrl("/users/token/logout")}
        aria-hidden="true"
      />
    </div>
  );
}
