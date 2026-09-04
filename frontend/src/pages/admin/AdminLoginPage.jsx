import {useQuery} from "@tanstack/react-query";
import {ShieldCheck} from "lucide-react";
import {Link} from "react-router-dom";
import {backendUrl, request} from "../../api/http";
import Notice from "../../components/Notice";

export default function AdminLoginPage() {
  const resultQuery = useQuery({
    queryKey: ["admin-auth-result"],
    queryFn: () => request("/auth/result"),
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="auth-content admin-login-content">
      <ShieldCheck aria-hidden="true" />
      <p className="eyebrow">MushMush Admin</p>
      <h1>관리자 로그인</h1>
      <p className="auth-description">운영 권한이 있는 계정으로 로그인해 주세요.</p>
      <Notice notice={resultQuery.data} />
      <form className="form-stack" method="post" action={backendUrl("/admin/login")}>
        <label>
          관리자 이메일
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          비밀번호
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="button button--primary button--wide" type="submit">
          관리자 로그인
        </button>
      </form>
      <p className="auth-bottom-link">
        <Link to="/login">일반 로그인으로 돌아가기</Link>
      </p>
    </div>
  );
}
