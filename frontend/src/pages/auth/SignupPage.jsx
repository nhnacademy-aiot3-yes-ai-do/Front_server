import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { backendUrl, request, unwrapApiResponse } from "../../api/http";
import Notice from "../../components/Notice";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [notice, setNotice] = useState(null);
  const [verified, setVerified] = useState(false);
  const formRef = useRef(null);
  const resultQuery = useQuery({
    queryKey: ["auth-result", "signup"],
    queryFn: () => request("/auth/result"),
    staleTime: Infinity,
    retry: false,
  });

  const field = (name) => formRef.current?.elements.namedItem(name);

  const sendCode = async () => {
    const emailInput = field("email");
    if (!emailInput?.reportValidity()) return;
    setNotice({ type: "info", message: "인증번호를 보내고 있어요." });
    try {
      const body = new URLSearchParams({ email: emailInput.value.trim() });
      await request("/users/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      setNotice({ type: "success", message: "이메일로 인증번호를 보냈습니다." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  const verifyCode = async () => {
    const email = field("email")?.value.trim();
    const codeInput = field("verificationCode");
    if (!codeInput?.reportValidity()) return;
    try {
      const body = new URLSearchParams({ email, code: codeInput.value.trim() });
      const result = await request("/users/signup/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = unwrapApiResponse(result);
      if (!data?.verified && data !== true) throw new Error("인증번호가 일치하지 않습니다.");
      setVerified(true);
      setNotice({ type: "success", message: "이메일 인증이 완료되었습니다." });
    } catch (error) {
      setVerified(false);
      setNotice({ type: "error", message: error.message });
    }
  };

  const goToProfile = () => {
    const email = field("email");
    const password = field("password");
    const confirm = field("confirmPassword");
    if (!email?.reportValidity() || !password?.reportValidity() || !confirm?.reportValidity())
      return;
    if (!verified) {
      setNotice({ type: "error", message: "이메일 인증을 완료해 주세요." });
      return;
    }
    if (password.value !== confirm.value) {
      setNotice({ type: "error", message: "비밀번호가 일치하지 않습니다." });
      return;
    }
    setNotice(null);
    setStep(2);
  };

  const checkNickname = async () => {
    const nicknameInput = field("nickname");
    if (!nicknameInput?.reportValidity()) return;
    try {
      const available = await request(
        `/users/check-nickname?nickname=${encodeURIComponent(nicknameInput.value.trim())}`,
      );
      setNotice({
        type: available ? "success" : "error",
        message: available ? "사용할 수 있는 닉네임입니다." : "이미 사용 중인 닉네임입니다.",
      });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  return (
    <div className="auth-content auth-content--wide">
      <p className="eyebrow">MushMush 시작하기</p>
      <h1>새 계정을 만들어요</h1>
      <div className="step-indicator" aria-label="가입 진행 단계">
        <span className={step === 1 ? "active" : "done"}>1. 계정</span>
        <span className={step === 2 ? "active" : ""}>2. 프로필</span>
      </div>
      <Notice notice={notice || resultQuery.data} onDismiss={() => setNotice(null)} />
      <form
        ref={formRef}
        className="form-stack"
        method="post"
        action={backendUrl("/signup")}
        encType="multipart/form-data"
      >
        <fieldset hidden={step !== 1}>
          <label>
            이메일
            <span className="field-action">
              <input name="email" type="email" autoComplete="username" required />
              <button type="button" onClick={sendCode}>
                인증번호 발송
              </button>
            </span>
          </label>
          <label>
            인증번호
            <span className="field-action">
              <input name="verificationCode" inputMode="numeric" required />
              <button type="button" onClick={verifyCode}>
                확인
              </button>
            </span>
          </label>
          <label>
            비밀번호
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
            />
          </label>
          <label>
            비밀번호 확인
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
            />
          </label>
          <button className="button button--primary" type="button" onClick={goToProfile}>
            다음
          </button>
        </fieldset>
        <fieldset hidden={step !== 2}>
          <label>
            닉네임
            <span className="field-action">
              <input name="nickname" maxLength="30" required />
              <button type="button" onClick={checkNickname}>
                중복 확인
              </button>
            </span>
          </label>
          <label>
            프로필 사진 <small>선택 사항</small>
            <input name="profileImage" type="file" accept="image/*" />
          </label>
          <div className="form-actions">
            <button className="button button--secondary" type="button" onClick={() => setStep(1)}>
              이전
            </button>
            <button className="button button--primary" type="submit">
              가입 완료
            </button>
          </div>
        </fieldset>
      </form>
      <p className="auth-bottom-link">
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}
