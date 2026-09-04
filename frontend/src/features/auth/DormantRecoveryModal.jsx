import {CheckCircle2, MailCheck} from "lucide-react";
import {useEffect, useState} from "react";
import {request, unwrapApiResponse} from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";

export default function DormantRecoveryModal({ email, onClose }) {
  const [step, setStep] = useState("notice");
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (step !== "code" || remaining <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [remaining, step]);

  const sendCode = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await request(`/users/email/send?email=${encodeURIComponent(email)}`, {
        method: "POST",
      }).then(unwrapApiResponse);
      setRemaining(30);
      setStep("code");
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    if (!/^\d{6}$/.test(code)) {
      setNotice({ type: "error", message: "인증번호는 숫자 6자리로 입력해 주세요." });
      return;
    }
    if (remaining <= 0) {
      setNotice({ type: "error", message: "인증 시간이 만료되었습니다. 다시 발송해 주세요." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const verified = await request(
        `/users/email/verify?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`,
        { method: "POST" },
      );
      if (!verified) throw new Error("인증번호가 올바르지 않습니다.");

      await request(`/users/dormant/release?email=${encodeURIComponent(email)}`, {
        method: "POST",
      }).then(unwrapApiResponse);
      setRemaining(0);
      setStep("success");
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="휴면 계정 안내" onClose={onClose}>
      <Notice notice={notice} onDismiss={() => setNotice(null)} />
      {step === "notice" && (
        <div className="form-stack dormant-step">
          <MailCheck aria-hidden="true" />
          <p>장기간 로그인하지 않아 휴면 상태로 전환된 계정입니다.</p>
          <label>
            복구할 계정
            <input value={email} readOnly />
          </label>
          <div className="modal-actions">
            <button className="button button--secondary" type="button" onClick={onClose}>
              닫기
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={sendCode}
              disabled={busy}
            >
              {busy ? "발송 중…" : "인증번호 받기"}
            </button>
          </div>
        </div>
      )}
      {step === "code" && (
        <form className="form-stack dormant-step" onSubmit={verifyCode}>
          <p>
            <strong>{email}</strong>로 인증번호를 발송했습니다.
          </p>
          <label>
            인증번호
            <span className="timed-input">
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength="6"
                required
                autoFocus
              />
              <small>{remaining > 0 ? `0:${String(remaining).padStart(2, "0")}` : "만료됨"}</small>
            </span>
          </label>
          <div className="modal-actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={sendCode}
              disabled={busy}
            >
              재발송
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={busy || remaining <= 0}
            >
              {busy ? "확인 중…" : "인증하고 해제"}
            </button>
          </div>
        </form>
      )}
      {step === "success" && (
        <div className="form-stack dormant-step dormant-step--success">
          <CheckCircle2 aria-hidden="true" />
          <h3>휴면 상태를 해제했습니다</h3>
          <p>이제 기존 계정으로 다시 로그인할 수 있습니다.</p>
          <button className="button button--primary button--wide" type="button" onClick={onClose}>
            로그인으로 돌아가기
          </button>
        </div>
      )}
    </Modal>
  );
}
