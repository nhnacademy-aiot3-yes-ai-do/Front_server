import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { backendUrl, request } from "../../api/http";
import Notice from "../../components/Notice";
import DormantRecoveryModal from "../../features/auth/DormantRecoveryModal";

export default function LoginPage() {
  const [dormantOpen, setDormantOpen] = useState(false);
  const resultQuery = useQuery({
    queryKey: ["auth-result"],
    queryFn: () => request("/auth/result"),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (resultQuery.data?.type === "dormant" && resultQuery.data.email) {
      setDormantOpen(true);
    }
  }, [resultQuery.data]);

  return (
    <div className="auth-content">
      {resultQuery.data?.type !== "dormant" && <Notice notice={resultQuery.data} />}
      <form className="form-stack" method="post" action={backendUrl("/login")}>
        <input name="email" type="email" placeholder="이메일" autoComplete="username" required />
        <input
          name="password"
          type="password"
          placeholder="비밀번호"
          autoComplete="current-password"
          required
        />
        <button className="button button--primary button--wide" type="submit">
          로그인
        </button>
      </form>
      <div className="auth-divider">또는</div>
      <a
        className="button button--google button--wide"
        href={backendUrl("/oauth2/authorization/google")}
      >
        <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" width="18" height="18" />
        Google 계정으로 로그인
      </a>
      <div className="auth-links">
        <Link to="/signup">회원가입</Link>
        <span>|</span>
        <Link to="/find-password">비밀번호 찾기</Link>
      </div>
      {dormantOpen && (
        <DormantRecoveryModal
          email={resultQuery.data.email}
          onClose={() => setDormantOpen(false)}
        />
      )}
    </div>
  );
}
