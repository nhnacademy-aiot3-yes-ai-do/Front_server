import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="auth-logo" to="/login" aria-label="MushMush 로그인">
          <img src="/images/logo1.png" alt="MushMush" />
        </Link>
        <Outlet />
      </section>
    </main>
  );
}
