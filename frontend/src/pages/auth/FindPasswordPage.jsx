import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { request } from "../../api/http";
import Notice from "../../components/Notice";

export default function FindPasswordPage() {
  const emailRef = useRef(null);
  const codeRef = useRef(null);
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  const sendCode = async () => {
    if (!emailRef.current?.reportValidity()) return;
    try {
      const body = JSON.stringify({email: emailRef.current.value.trim(),});
      await request("/users/password-reset/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      setCodeSent(true);
      setNotice({ type: "success", message: "인증번호를 보냈습니다." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  const verify = async () => {
    if (!codeRef.current?.reportValidity()) return;
    try {
      const verified = await request("/users/password-reset/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailRef.current.value.trim(),
          code: codeRef.current.value.trim(),
        }),
      });
      if (!verified) throw new Error("인증번호가 일치하지 않습니다.");
      navigate("/reset-password");
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  return (
    <div className="auth-content">
      <p className="eyebrow">계정 찾기</p>
      <h1>비밀번호를 다시 설정해요</h1>
      <p className="auth-description">가입한 이메일로 인증번호를 보내드립니다.</p>
      <Notice notice={notice} />
      <div className="form-stack">
        <label>
          이메일
          <input ref={emailRef} type="email" autoComplete="username" required />
        </label>
        <button className="button button--secondary" type="button" onClick={sendCode}>
          인증번호 보내기
        </button>
        {codeSent && (
          <label>
            인증번호
            <input ref={codeRef} inputMode="numeric" required />
          </label>
        )}
        {codeSent && (
          <button className="button button--primary" type="button" onClick={verify}>
            인증하고 계속
          </button>
        )}
      </div>
      <p className="auth-bottom-link">
        <Link to="/login">로그인으로 돌아가기</Link>
      </p>
    </div>
  );
}
