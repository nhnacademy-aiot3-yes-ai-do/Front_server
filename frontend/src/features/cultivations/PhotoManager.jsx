import {useQueryClient} from "@tanstack/react-query";
import {Trash2} from "lucide-react";
import {useState} from "react";
import {request} from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import {formatDateTime} from "../../utils/formatters";

export default function PhotoManager({ cultivationId, photos, canManage, onClose }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const uploadPhoto = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get("file");
    if (!(file instanceof File) || file.size === 0) return;
    if (file.size > 10 * 1024 * 1024) {
      setNotice({ type: "error", message: "사진은 10MB 이하만 업로드할 수 있습니다." });
      return;
    }

    setBusy(true);
    setNotice({ type: "info", message: "사진을 업로드하고 있습니다…" });
    try {
      await request(`/cultivations/${cultivationId}/photos`, { method: "POST", body });
      form.reset();
      await queryClient.invalidateQueries({
        queryKey: ["cultivations", "detail", cultivationId],
      });
      setNotice({ type: "success", message: "사진을 업로드했습니다." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (photo) => {
    if (!window.confirm("이 재배 사진을 삭제할까요?")) return;
    setBusy(true);
    try {
      await request(`/cultivations/${cultivationId}/photos/${photo.photoId}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["cultivations", "detail", cultivationId] });
      setNotice({ type: "success", message: "사진을 삭제했습니다." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="재배 사진 관리" onClose={onClose} className="modal-card--wide">
      <Notice notice={notice} />
      {canManage && (
        <form className="photo-upload-form" onSubmit={uploadPhoto}>
          <label>
            새 사진 선택
            <input name="file" type="file" accept="image/*" required />
          </label>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? "업로드 중…" : "업로드"}
          </button>
        </form>
      )}
      <div className="photo-grid">
        {photos.map((photo) => (
          <article key={photo.photoId}>
            <img src={photo.uri} alt={`재배 사진 ${formatDateTime(photo.updatedAt)}`} />
            <footer>
              <span>{formatDateTime(photo.updatedAt)}</span>
              {canManage && (
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  aria-label="사진 삭제"
                  onClick={() => removePhoto(photo)}
                  disabled={busy}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              )}
            </footer>
          </article>
        ))}
        {photos.length === 0 && <p className="modal-empty">등록된 사진이 없습니다.</p>}
      </div>
    </Modal>
  );
}
