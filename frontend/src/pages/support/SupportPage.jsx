import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Plus } from "lucide-react";
import { useState } from "react";
import { request, unwrapApiResponse } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState";
import { formatDateTime, normalizeList } from "../../utils/formatters";

function statusLabel(status) {
  return (
    { PENDING: "답변 대기", IN_PROGRESS: "처리 중", ANSWERED: "답변 완료", CLOSED: "종료" }[
      status
    ] || status
  );
}

function NewInquiryModal({ categories, cultivations, onClose }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const submit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const files = values.getAll("files").filter((file) => file.size > 0);
    const payload = {
      categoryId: Number(values.get("categoryId")),
      title: String(values.get("title")).trim(),
      content: String(values.get("content")).trim(),
      cultivationId: values.get("cultivationId") ? Number(values.get("cultivationId")) : null,
    };
    const body = new FormData();
    body.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
    files.forEach((file) => body.append("files", file));
    setBusy(true);
    try {
      await request("/support/inquiries", { method: "POST", body });
      await queryClient.invalidateQueries({ queryKey: ["my-inquiries"] });
      onClose();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
      setBusy(false);
    }
  };

  return (
    <Modal title="새 문의 작성" onClose={onClose} className="modal-card--wide">
      <Notice notice={notice} />
      <form className="form-stack" onSubmit={submit}>
        <label>
          문의 유형
          <select name="categoryId" required>
            <option value="">선택하세요</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.categoryName}
              </option>
            ))}
          </select>
        </label>
        <label>
          관련 재배지 <small>선택 사항</small>
          <select name="cultivationId">
            <option value="">관련 재배지 없음</option>
            {cultivations.map((cultivation) => (
              <option key={cultivation.cultivationId} value={cultivation.cultivationId}>
                {cultivation.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          제목
          <input name="title" maxLength="100" required />
        </label>
        <label>
          문의 내용
          <textarea name="content" rows="7" required />
        </label>
        <label>
          사진 첨부 <small>최대 5개</small>
          <input name="files" type="file" accept="image/*" multiple />
        </label>
        <div className="form-actions">
          <button className="button button--secondary" type="button" onClick={onClose}>
            취소
          </button>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? "등록 중…" : "문의 등록"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function InquiryDetail({ inquiryId, onClose }) {
  const detailQuery = useQuery({
    queryKey: ["inquiry", inquiryId],
    queryFn: () => request(`/support/inquiries/${inquiryId}`).then(unwrapApiResponse),
  });

  return (
    <Modal title="문의 내용" onClose={onClose} className="modal-card--wide">
      {detailQuery.isLoading && <LoadingState />}
      {detailQuery.isError && (
        <ErrorState error={detailQuery.error} onRetry={detailQuery.refetch} />
      )}
      {detailQuery.data && (
        <div className="inquiry-detail">
          <header>
            <span className="status-badge status-badge--stable">
              {statusLabel(detailQuery.data.status)}
            </span>
            <h2>{detailQuery.data.title}</h2>
            <p>
              {detailQuery.data.categoryName} · {formatDateTime(detailQuery.data.createdAt)}
            </p>
          </header>
          {normalizeList(detailQuery.data.messages).map((message) => (
            <article key={message.id}>
              <p>{message.content}</p>
              {message.answerContent && <blockquote>{message.answerContent}</blockquote>}
              <div className="inquiry-photos">
                {normalizeList(message.photoUrls).map((url) => (
                  <img key={url} src={url} alt="문의 첨부" />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function SupportPage() {
  const [modal, setModal] = useState(null);
  const inquiriesQuery = useQuery({
    queryKey: ["my-inquiries"],
    queryFn: () => request("/support/inquiries?page=0&size=50").then(unwrapApiResponse),
  });
  const categoriesQuery = useQuery({
    queryKey: ["inquiry-categories"],
    queryFn: () => request("/support/inquiries/categories").then(unwrapApiResponse),
  });
  const cultivationsQuery = useQuery({
    queryKey: ["inquiry-cultivations"],
    queryFn: () => request("/support/inquiries/my-cultivations").then(unwrapApiResponse),
  });

  if (inquiriesQuery.isLoading) return <LoadingState message="문의 내역을 불러오고 있어요." />;
  if (inquiriesQuery.isError)
    return <ErrorState error={inquiriesQuery.error} onRetry={inquiriesQuery.refetch} />;

  const inquiries = normalizeList(inquiriesQuery.data?.content);
  return (
    <main className="workspace-page">
      <section className="workspace-panel">
        <header className="page-heading">
          <div>
            <p className="eyebrow">MushMush 고객 지원</p>
            <h1>회원문의</h1>
            <p>재배와 서비스 이용 중 궁금한 점을 남겨주세요.</p>
          </div>
          <button className="button button--primary" type="button" onClick={() => setModal("new")}>
            <Plus aria-hidden="true" /> 새 문의
          </button>
        </header>
        {inquiries.length === 0 ? (
          <EmptyState
            title="등록한 문의가 없습니다."
            description="도움이 필요하면 새 문의를 작성해 주세요."
          />
        ) : (
          <div className="inquiry-list">
            {inquiries.map((inquiry) => (
              <button key={inquiry.id} type="button" onClick={() => setModal(inquiry.id)}>
                <MessageCircle aria-hidden="true" />
                <span>
                  <strong>{inquiry.title}</strong>
                  <small>
                    {inquiry.categoryName} · {formatDateTime(inquiry.createdAt)}
                  </small>
                </span>
                <span className="status-badge status-badge--stable">
                  {statusLabel(inquiry.status)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      {modal === "new" && (
        <NewInquiryModal
          categories={normalizeList(categoriesQuery.data)}
          cultivations={normalizeList(cultivationsQuery.data?.cultivationSummaryResponses)}
          onClose={() => setModal(null)}
        />
      )}
      {typeof modal === "number" && (
        <InquiryDetail inquiryId={modal} onClose={() => setModal(null)} />
      )}
    </main>
  );
}
