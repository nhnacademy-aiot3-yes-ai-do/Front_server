import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { backendUrl, request, unwrapApiResponse } from "../../api/http";
import Notice from "../../components/Notice";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState(null);

  const resultQuery = useQuery({
    queryKey: ["auth-result", "reset-password"],
    queryFn: () => request("/auth/result"),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    let isMounted = true;
    request("/users/password-reset/verified-email")
      .then(unwrapApiResponse)
      .then((email) => {
        if (!isMounted) return;
        if (!email) {
          navigate("/find-password", { replace: true });
        } else {
          setVerifiedEmail(email);
          setChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          navigate("/find-password", { replace: true });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleSubmit = (event) => {
    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (newPassword !== confirmPassword) {
      event.preventDefault();
      setNotice({ type: "error", message: "비밀번호가 일치하지 않습니다." });
    }
  };

  if (checking) {
    return (
      <div className="auth-content">
        <p className="route-loading">인증 상태 확인 중…</p>
      </div>
    );
  }

  return (
    <div className="auth-content">
      <p className="eyebrow">비밀번호 재설정</p>
      <h1>새 비밀번호를 입력해 주세요</h1>
      {verifiedEmail && (
        <p className="auth-description">
          <strong>{verifiedEmail}</strong> 계정의 새 비밀번호를 설정합니다.
        </p>
      )}
      <Notice notice={notice || resultQuery.data} onDismiss={() => setNotice(null)} />
      <form
        className="form-stack"
        method="post"
        action={backendUrl("/reset-password")}
        onSubmit={handleSubmit}
      >
        <label>
          새 비밀번호
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength="8"
            placeholder="새 비밀번호"
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
            placeholder="새 비밀번호 확인"
            required
          />
        </label>
        <p className="help-text">※ 비밀번호는 영문, 숫자, 특수문자(@$!%*#?&.) 포함 8자 이상</p>
        <button className="button button--primary button--wide" type="submit">
          비밀번호 변경
        </button>
      </form>
      <p className="auth-bottom-link">
        <Link to="/login">로그인으로 돌아가기</Link>
      </p>
    </div>
  );
}
