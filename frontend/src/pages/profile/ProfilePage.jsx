import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, KeyRound, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { jsonRequest, request, unwrapApiResponse } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { ErrorState, LoadingState } from "../../components/PageState";
import { formatDate } from "../../utils/formatters";

export default function ProfilePage() {
  const [notice, setNotice] = useState(null);
  const [withdrawNotice, setWithdrawNotice] = useState(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: () => request("/users/mypage").then(unwrapApiResponse),
  });

  const updateProfile = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await jsonRequest("/users/mypage", "PUT", {
        nickname: String(values.get("nickname")).trim(),
      }).then(unwrapApiResponse);
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      setNotice({ type: "success", message: "프로필을 수정했습니다." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setNotice({ type: "error", message: "JPG, PNG, WEBP 이미지만 업로드할 수 있습니다." });
      event.target.value = "";
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setBusy(true);
    try {
      await request("/users/mypage/profile-image", { method: "PUT", body }).then(unwrapApiResponse);
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      setNotice({ type: "success", message: "프로필 사진을 변경했습니다." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const newPassword = String(values.get("newPassword"));
    const confirmPassword = String(values.get("confirmPassword"));
    if (newPassword !== confirmPassword) {
      setNotice({ type: "error", message: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    setBusy(true);
    try {
      await jsonRequest("/users/mypage/password", "PUT", {
        currentPassword: String(values.get("currentPassword")),
        newPassword,
      }).then(unwrapApiResponse);
      form.reset();
      window.location.assign("/login");
    } catch (error) {
      setNotice({ type: "error", message: error.message });
      setBusy(false);
    }
  };

  const withdraw = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password"));
    setBusy(true);
    setWithdrawNotice(null);
    try {
      await jsonRequest("/users/withdraw", "DELETE", { password }).then(unwrapApiResponse);
      form.reset();
      window.location.assign("/login");
    } catch (error) {
      setWithdrawNotice({ type: "error", message: error.message });
      setBusy(false);
    }
  };

  const withdrawGoogleAccount = async () => {
    setBusy(true);
    setWithdrawNotice(null);
    try {
      await request("/users/withdraw/oauth", { method: "DELETE" }).then(unwrapApiResponse);
      window.location.assign("/login?withdrawn=true");
    } catch (error) {
      setWithdrawNotice({ type: "error", message: error.message });
      setBusy(false);
    }
  };

  if (profileQuery.isLoading) return <LoadingState message="내 정보를 불러오고 있어요." />;
  if (profileQuery.isError)
    return <ErrorState error={profileQuery.error} onRetry={profileQuery.refetch} />;

  const profile = profileQuery.data;
  const displayName = profile.nickname || "사용자";
  return (
    <main className="workspace-page">
      <section className="workspace-panel profile-page">
        <header className="page-heading">
          <div>
            <p className="eyebrow">내 계정</p>
            <h1>내 정보</h1>
            <p>프로필과 로그인 정보를 안전하게 관리하세요.</p>
          </div>
        </header>
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <section className="profile-grid">
          <article className="panel-card profile-summary">
            <label className="profile-photo" aria-label="프로필 사진 변경">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="현재 프로필" />
              ) : (
                <span>{displayName.slice(0, 1)}</span>
              )}
              <Camera aria-hidden="true" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadPhoto}
                disabled={busy}
              />
            </label>
            <h2>{displayName}</h2>
            <p>{profile.email}</p>
            <small>{formatDate(profile.createdAt)} 가입</small>
          </article>
          <div className="profile-forms">
            <form className="panel-card form-stack" onSubmit={updateProfile}>
              <h2>기본 정보</h2>
              <label>
                이메일
                <input value={profile.email} readOnly />
              </label>
              <label>
                닉네임
                <input name="nickname" defaultValue={displayName} maxLength="30" required />
              </label>
              <button className="button button--primary" type="submit" disabled={busy}>
                <Save aria-hidden="true" /> 저장
              </button>
            </form>
            {profile.hasPassword && (
              <form className="panel-card form-stack" onSubmit={changePassword}>
                <h2>비밀번호 변경</h2>
                <label>
                  현재 비밀번호
                  <input
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
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
                <button className="button button--secondary" type="submit" disabled={busy}>
                  <KeyRound aria-hidden="true" /> 비밀번호 변경
                </button>
              </form>
            )}
            <section className="panel-card profile-danger-zone">
              <div>
                <h2>회원 탈퇴</h2>
                <p>탈퇴하면 재배지와 센서, 재배 이력 데이터는 복구할 수 없습니다.</p>
              </div>
              <button
                className="button button--danger"
                type="button"
                onClick={() => {
                  setWithdrawNotice(null);
                  setWithdrawOpen(true);
                }}
                disabled={busy}
              >
                <Trash2 aria-hidden="true" /> 회원 탈퇴
              </button>
            </section>
          </div>
        </section>
      </section>
      {withdrawOpen && (
        <Modal title="정말 탈퇴하시겠어요?" onClose={() => setWithdrawOpen(false)}>
          {profile.hasPassword ? (
            <form className="form-stack" onSubmit={withdraw}>
              <Notice notice={withdrawNotice} onDismiss={() => setWithdrawNotice(null)} />
              <p className="danger-description">
                탈퇴하면 재배지, 센서, 재배 이력 등 모든 데이터가 삭제되며 복구할 수 없습니다.
              </p>
              <label>
                비밀번호 확인
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                />
              </label>
              <div className="modal-actions">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => setWithdrawOpen(false)}
                >
                  취소
                </button>
                <button className="button button--danger" type="submit" disabled={busy}>
                  {busy ? "처리 중…" : "탈퇴하기"}
                </button>
              </div>
            </form>
          ) : (
            <div className="form-stack">
              <Notice notice={withdrawNotice} onDismiss={() => setWithdrawNotice(null)} />
              <p className="danger-description">
                탈퇴하면 재배지와 센서, 재배 이력 데이터는 복구할 수 없습니다. 그래도 탈퇴하시겠어요?
              </p>
              <div className="modal-actions">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => setWithdrawOpen(false)}
                >
                  취소
                </button>
                <button
                  className="button button--danger"
                  type="button"
                  onClick={withdrawGoogleAccount}
                  disabled={busy}
                >
                  {busy ? "처리 중…" : "탈퇴하기"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}
