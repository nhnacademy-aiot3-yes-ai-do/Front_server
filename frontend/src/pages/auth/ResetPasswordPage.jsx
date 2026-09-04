import { useQuery } from "@tanstack/react-query";
import { backendUrl, request } from "../../api/http";
import Notice from "../../components/Notice";

export default function ResetPasswordPage() {
  const resultQuery = useQuery({
    queryKey: ["auth-result", "reset-password"],
    queryFn: () => request("/auth/result"),
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="auth-content">
      <p className="eyebrow">비밀번호 재설정</p>
      <h1>새 비밀번호를 입력해 주세요</h1>
      <Notice notice={resultQuery.data} />
      <form className="form-stack" method="post" action={backendUrl("/reset-password")}>
        <label>
          새 비밀번호
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
          />
        </label>
        <label>
          새 비밀번호 확인
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
          />
        </label>
        <button className="button button--primary" type="submit">
          비밀번호 변경
        </button>
      </form>
    </div>
  );
}
