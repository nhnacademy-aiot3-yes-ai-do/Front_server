import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CalendarClock,
  CalendarPlus,
  CircleUserRound,
  KeyRound,
  Mail,
  Pencil,
  TriangleAlert,
  User,
} from "lucide-react";
import { useState } from "react";
import { jsonRequest, request, unwrapApiResponse } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { ErrorState, LoadingState } from "../../components/PageState";
import { formatDate } from "../../utils/formatters";

export default function ProfilePage() {
  const [notice, setNotice] = useState(null);
  const [withdrawNotice, setWithdrawNotice] = useState(null);
  const [modal, setModal] = useState(null);
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
      setModal(null);
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
      event.target.value = "";
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
      <section className="profile-card-wrap">
        <article className="panel-card profile-card">
          <div className="profile-image-section">
            <div className="profile-avatar">
              {profile.photoUrl ? (
                <img alt="현재 프로필" src={profile.photoUrl} />
              ) : (
                <CircleUserRound aria-hidden="true" />
              )}
            </div>
            <label className="profile-image-upload-button">
              <Camera aria-hidden="true" /> 사진 변경
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                hidden
                onChange={uploadPhoto}
                type="file"
              />
            </label>
          </div>

          <h2 className="profile-name">{displayName}</h2>

          <Notice notice={notice} onDismiss={() => setNotice(null)} />

          <div className="info-rows">
            <div className="info-row">
              <span className="info-label">
                <Mail aria-hidden="true" />
                이메일
              </span>
              <span className="info-value">{profile.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">
                <User aria-hidden="true" />
                닉네임
              </span>
              <span className="info-value">{displayName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">
                <CalendarPlus aria-hidden="true" />
                가입일
              </span>
              <span className="info-value">{formatDate(profile.createdAt)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">
                <CalendarClock aria-hidden="true" />
                최종 수정일
              </span>
              <span className="info-value">{formatDate(profile.updatedAt)}</span>
            </div>
          </div>

          <button
            className="button button--primary profile-full-btn"
            onClick={() => setModal("edit")}
            type="button"
          >
            <Pencil aria-hidden="true" /> 회원정보 수정
          </button>

          {profile.hasPassword && (
            <button
              className="button button--secondary profile-full-btn"
              onClick={() => setModal("password")}
              type="button"
            >
              <KeyRound aria-hidden="true" /> 비밀번호 변경
            </button>
          )}

          <button
            className="profile-delete-link"
            onClick={() => {
              setWithdrawNotice(null);
              setModal("withdraw");
            }}
            type="button"
          >
            회원 탈퇴
          </button>
        </article>
      </section>

      {modal === "edit" && (
        <Modal title="회원정보 수정" onClose={() => setModal(null)}>
          <p className="modal-desc">닉네임을 수정할 수 있어요.</p>
          <form className="form-stack" onSubmit={updateProfile}>
            <label>
              닉네임
              <input defaultValue={displayName} maxLength="30" name="nickname" required />
            </label>
            <div className="modal-actions">
              <button
                className="button button--secondary"
                onClick={() => setModal(null)}
                type="button"
              >
                취소
              </button>
              <button className="button button--primary" disabled={busy} type="submit">
                저장
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "password" && (
        <Modal title="비밀번호 변경" onClose={() => setModal(null)}>
          <p className="modal-desc">안전한 비밀번호를 위해 현재 비밀번호를 먼저 확인해주세요.</p>
          <form className="form-stack" onSubmit={changePassword}>
            <label>
              현재 비밀번호
              <input
                autoComplete="current-password"
                name="currentPassword"
                required
                type="password"
              />
            </label>
            <label>
              새 비밀번호
              <input
                autoComplete="new-password"
                minLength="8"
                name="newPassword"
                required
                type="password"
              />
            </label>
            <label>
              새 비밀번호 확인
              <input
                autoComplete="new-password"
                minLength="8"
                name="confirmPassword"
                required
                type="password"
              />
            </label>
            <div className="modal-actions">
              <button
                className="button button--secondary"
                onClick={() => setModal(null)}
                type="button"
              >
                취소
              </button>
              <button className="button button--primary" disabled={busy} type="submit">
                비밀번호 변경
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "withdraw" && (
        <Modal title="정말 탈퇴하시겠어요?" onClose={() => setModal(null)}>
          <div className="delete-warning-icon">
            <TriangleAlert aria-hidden="true" />
          </div>
          {profile.hasPassword ? (
            <form className="form-stack" onSubmit={withdraw}>
              <Notice notice={withdrawNotice} onDismiss={() => setWithdrawNotice(null)} />
              <div className="delete-warning-box">
                탈퇴하면 재배지, 센서, 재배 이력 등 모든 데이터가 삭제되며
                <br />
                복구할 수 없어요.
              </div>
              <label>
                비밀번호 확인
                <input
                  autoComplete="current-password"
                  autoFocus
                  name="password"
                  required
                  type="password"
                />
              </label>
              <div className="modal-actions">
                <button
                  className="button button--secondary"
                  onClick={() => setModal(null)}
                  type="button"
                >
                  취소
                </button>
                <button className="button button--danger" disabled={busy} type="submit">
                  {busy ? "처리 중…" : "탈퇴하기"}
                </button>
              </div>
            </form>
          ) : (
            <div className="form-stack">
              <Notice notice={withdrawNotice} onDismiss={() => setWithdrawNotice(null)} />
              <div className="delete-warning-box">
                탈퇴하면 재배지, 센서, 재배 이력 등 모든 데이터가 삭제되며
                <br />
                복구할 수 없어요. 그래도 탈퇴하시겠어요?
              </div>
              <div className="modal-actions">
                <button
                  className="button button--secondary"
                  onClick={() => setModal(null)}
                  type="button"
                >
                  취소
                </button>
                <button
                  className="button button--danger"
                  disabled={busy}
                  onClick={withdrawGoogleAccount}
                  type="button"
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
