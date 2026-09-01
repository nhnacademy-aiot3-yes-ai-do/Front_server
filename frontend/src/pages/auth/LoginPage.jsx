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
      <p className="eyebrow">재배 중심 스마트팜</p>
      <h1>다시 만나서 반가워요</h1>
      <p className="auth-description">오늘의 재배 환경을 확인하려면 로그인해 주세요.</p>
      {resultQuery.data?.type !== "dormant" && <Notice notice={resultQuery.data} />}
      <form className="form-stack" method="post" action={backendUrl("/login")}>
        <label>
          이메일
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          비밀번호
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="button button--primary button--wide" type="submit">
          로그인
        </button>
      </form>
      <div className="auth-links">
        <Link to="/find-password">비밀번호 찾기</Link>
        <Link to="/signup">회원가입</Link>
      </div>
      <a
        className="button button--google button--wide"
        href={backendUrl("/oauth2/authorization/google")}
      >
        Google로 계속하기
      </a>
      {dormantOpen && (
        <DormantRecoveryModal
          email={resultQuery.data.email}
          onClose={() => setDormantOpen(false)}
        />
      )}
    </div>
  );
}
