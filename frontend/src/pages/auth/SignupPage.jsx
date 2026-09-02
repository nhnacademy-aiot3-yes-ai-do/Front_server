import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { backendUrl, request, unwrapApiResponse } from "../../api/http";
import Notice from "../../components/Notice";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [notice, setNotice] = useState(null);
  const [verified, setVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
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
    setNotice(null);
    try {
      const body = new URLSearchParams({ email: emailInput.value.trim() });
      await request("/users/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      setCodeSent(true);
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarPreview(null);
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
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
      setNotice(null);
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
    <div className="auth-content">
      <Notice notice={notice || resultQuery.data} onDismiss={() => setNotice(null)} />
      <form
        ref={formRef}
        method="post"
        action={backendUrl("/signup")}
        encType="multipart/form-data"
      >
        <fieldset hidden={step !== 1}>
          <div className="field">
            <div className="field-inline">
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
              <button type="button" className="btn-inline" onClick={sendCode}>
                이메일 인증
              </button>
            </div>
          </div>
          {codeSent && (
            <div className="field">
              <div className="field-inline">
                <input
                  name="verificationCode"
                  placeholder="인증번호 6자리"
                  inputMode="numeric"
                  maxLength="6"
                  required
                />
                <button type="button" className="btn-inline" onClick={verifyCode}>
                  인증확인
                </button>
              </div>
              {verified && <p className="help-text ok">이메일 인증이 완료되었습니다.</p>}
            </div>
          )}
            <div className="field">
                <label className="sr-only" htmlFor="signup-password">
                    비밀번호
                </label>
                <input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="비밀번호"
                    autoComplete="new-password"
                    minLength="8"
                    required
                />
                <p className="help-text">※ 비밀번호는 영문, 숫자, 특수문자(@$!%*#?&.) 포함 8자 이상</p>
            </div>
            <div className="field">
                <label className="sr-only" htmlFor="signup-confirm-password">
                    비밀번호 확인
                </label>
                <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="비밀번호 확인"
                    autoComplete="new-password"
                    minLength="8"
                    required
                />
            </div>
          <button
            className="button button--primary button--wide"
            type="button"
            onClick={goToProfile}
          >
            다음
          </button>
          <div className="auth-links">
            <span>이미 계정이 있으신가요?</span>
            <Link to="/login">로그인</Link>
          </div>
        </fieldset>
        <fieldset hidden={step !== 2}>
          <div className="profile-row">
            <div className="avatar-upload">
              <label>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="선택한 프로필 사진 미리보기" />
                ) : (
                  <span>+</span>
                )}
                <input
                  name="profileImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <div className="field">
              <div className="field-inline">
                <input name="nickname" placeholder="닉네임" maxLength="30" required />
                <button type="button" className="btn-inline" onClick={checkNickname}>
                  중복확인
                </button>
              </div>
            </div>
          </div>
          <button className="button button--primary button--wide" type="submit">
            가입 완료
          </button>
          <button
            className="button button--secondary button--wide"
            type="button"
            onClick={() => setStep(1)}
          >
            이전
          </button>
        </fieldset>
      </form>
    </div>
  );
}
