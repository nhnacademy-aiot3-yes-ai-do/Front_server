import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { request } from "../../api/http";
import Notice from "../../components/Notice";

export default function FindPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const emailInputRef = useRef(null);
  const codeInputRef = useRef(null);
  const navigate = useNavigate();

  // 기존 비밀번호 재설정 세션 정리
  useEffect(() => {
    request("/users/password-reset/verified-email", { method: "DELETE" }).catch(() => {});
  }, []);

  // 1초 타이머 (인증 유효시간 3분, 재발송 쿨다운 30초)
  useEffect(() => {
    if (remaining <= 0 && cooldown <= 0) return undefined;
    const interval = window.setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [remaining, cooldown]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (codeSent) {
      setCodeSent(false);
      setCode("");
      setRemaining(0);
      setCooldown(0);
      setNotice(null);
    }
  };

  const sendCode = async () => {
    if (!emailInputRef.current?.reportValidity()) return;
    setBusy(true);
    setNotice(null);
    try {
      const body = JSON.stringify({ email: email.trim() });
      await request("/users/password-reset/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      setCodeSent(true);
      setRemaining(180); // 3분
      setCooldown(30); // 30초 쿨다운
      setNotice({ type: "success", message: "인증번호를 발송했습니다. 3분 이내에 입력해 주세요." });
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!codeInputRef.current?.reportValidity()) return;
    if (remaining <= 0) {
      setNotice({
        type: "error",
        message: "인증 시간이 만료되었습니다. 인증번호를 다시 받아주세요.",
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const verified = await request("/users/password-reset/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });
      if (!verified) {
        throw new Error("인증번호가 일치하지 않거나 만료되었습니다.");
      }
      navigate("/reset-password");
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-content">
      <p className="eyebrow">계정 찾기</p>
      <h1>비밀번호를 다시 설정해요</h1>
      <p className="auth-description">가입한 이메일로 인증번호를 보내드립니다.</p>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      <div className="form-stack">
        <label>
          이메일
          <input
            ref={emailInputRef}
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="you@example.com"
            autoComplete="username"
            disabled={busy}
            required
          />
        </label>

        {!codeSent ? (
          <button
            className="button button--primary button--wide"
            type="button"
            onClick={sendCode}
            disabled={busy}
          >
            {busy ? "발송 중…" : "인증번호 받기"}
          </button>
        ) : (
          <>
            <label>
              인증번호
              <span className="timed-input">
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="인증번호 6자리"
                  maxLength="6"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={busy}
                  required
                />
                <small>{remaining > 0 ? formatTime(remaining) : "만료됨"}</small>
              </span>
            </label>

            <button
              className="button button--primary button--wide"
              type="button"
              onClick={verify}
              disabled={busy || remaining <= 0 || !code.trim()}
            >
              {busy ? "확인 중…" : "인증하고 계속"}
            </button>

            <button
              className="button button--secondary button--wide"
              type="button"
              onClick={sendCode}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0 ? `인증번호 재발송 (${cooldown}초)` : "인증번호 재발송"}
            </button>
          </>
        )}
      </div>
      <p className="auth-bottom-link">
        <Link to="/login">로그인으로 돌아가기</Link>
      </p>
    </div>
  );
}
