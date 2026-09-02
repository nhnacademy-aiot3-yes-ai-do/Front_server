import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  X,
} from "lucide-react";
import { Fragment, useState } from "react";
import { request, unwrapApiResponse } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { ErrorState, LoadingState } from "../../components/PageState";
import { formatDate, formatDateTime, normalizeList } from "../../utils/formatters";

const PAGE_SIZE = 6;
const MAX_PHOTOS = 5;

function statusLabel(status) {
  return status === "RESOLVED" ? "답변완료" : "답변대기";
}

function statusTone(status) {
  return status === "RESOLVED" ? "answered" : "pending";
}

function addImageFiles(current, incoming) {
  const accepted = [...current];
  for (const file of incoming) {
    if (!file.type || !file.type.startsWith("image/")) continue;
    if (accepted.length >= MAX_PHOTOS) break;
    accepted.push(file);
  }
  return accepted;
}

function AttachChips({ files, onRemove }) {
  if (files.length === 0) return null;
  return (
    <div className="support-attach-chip-list">
      {files.map((file, index) => (
        <span className="support-attach-chip" key={`${file.name}-${index}`}>
          <img alt="" src={URL.createObjectURL(file)} />
          <span className="support-attach-filename">{file.name}</span>
          <button
            className="support-attach-remove"
            onClick={() => onRemove(index)}
            title="첨부 취소"
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

function NewInquiryModal({ categories, cultivations, onClose }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [files, setFiles] = useState([]);
  const queryClient = useQueryClient();

  const selectedCategory = categories.find((category) => String(category.id) === categoryId);
  const isCultivationCategory = selectedCategory?.categoryName === "재배 관련";

  const submit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const payload = {
      categoryId: Number(categoryId),
      title: String(values.get("title")).trim(),
      content: String(values.get("content")).trim(),
      cultivationId:
        isCultivationCategory && values.get("cultivationId")
          ? Number(values.get("cultivationId"))
          : null,
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
    <Modal title="문의 작성" onClose={onClose} className="modal-card--support">
      <div className="support-form-icon">
        <MessageSquare aria-hidden="true" />
      </div>
      <p className="support-modal-desc">
        궁금하신 점이나 불편하신 점을 남겨주시면 관리자가 확인 후 답변드려요.
      </p>
      <Notice notice={notice} />
      <form className="support-field-form" onSubmit={submit}>
        <div className="support-field">
          <label htmlFor="new-category">문의 유형</label>
          <select
            id="new-category"
            onChange={(event) => setCategoryId(event.target.value)}
            required
            value={categoryId}
          >
            <option value="">선택하세요</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.categoryName}
              </option>
            ))}
          </select>
        </div>
        {isCultivationCategory && (
          <div className="support-field">
            <label htmlFor="new-cultivation">어떤 재배에 대한 문의인가요?</label>
            <select id="new-cultivation" name="cultivationId">
              <option value="">관련 재배지 없음</option>
              {cultivations.map((cultivation) => (
                <option key={cultivation.cultivationId} value={cultivation.cultivationId}>
                  {cultivation.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="support-field">
          <label htmlFor="new-title">제목</label>
          <input
            id="new-title"
            maxLength="100"
            name="title"
            placeholder="문의 제목을 입력해주세요"
            required
          />
        </div>
        <div className="support-field">
          <label htmlFor="new-content">문의 내용</label>
          <AttachChips
            files={files}
            onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
          />
          <div className="support-content-composer">
            <textarea
              id="new-content"
              name="content"
              placeholder="문의하실 내용을 자세히 적어주세요"
              required
              rows="3"
            />
            <label className="support-attach-icon-btn" title="사진 첨부 (최대 5장)">
              <Paperclip aria-hidden="true" />
              <input
                accept="image/*"
                hidden
                multiple
                onChange={(event) => {
                  setFiles((current) => addImageFiles(current, [...event.target.files]));
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
          </div>
        </div>
        <div className="support-actions">
          <button className="button button--secondary" onClick={onClose} type="button">
            취소
          </button>
          <button className="button button--primary" disabled={busy} type="submit">
            <Send aria-hidden="true" /> {busy ? "등록 중…" : "문의 보내기"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function InquiryDetail({ inquiryId, onClose }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState([]);
  const detailQuery = useQuery({
    queryKey: ["inquiry", inquiryId],
    queryFn: () => request(`/support/inquiries/${inquiryId}`).then(unwrapApiResponse),
  });

  const submitFollowUp = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const content = form.elements.namedItem("content").value.trim();
    if (!content) return;

    const body = new FormData();
    body.append("request", new Blob([JSON.stringify({ content })], { type: "application/json" }));
    files.forEach((file) => body.append("files", file));
    setSending(true);
    try {
      await request(`/support/inquiries/${inquiryId}/messages`, { method: "POST", body });
      form.reset();
      setFiles([]);
      setNotice(null);
      await queryClient.invalidateQueries({ queryKey: ["inquiry", inquiryId] });
      await queryClient.invalidateQueries({ queryKey: ["my-inquiries"] });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    } finally {
      setSending(false);
    }
  };

  const inquiry = detailQuery.data;

  return (
    <Modal title="문의 내용" onClose={onClose} className="modal-card--support">
      {detailQuery.isLoading && <LoadingState />}
      {detailQuery.isError && (
        <ErrorState error={detailQuery.error} onRetry={detailQuery.refetch} />
      )}
      {inquiry && (
        <div className="support-detail">
          <header className="support-detail-head">
            <div>
              <span className="support-item-category">{inquiry.categoryName}</span>
              {inquiry.cultivationName && (
                <span className="support-item-cultivation">{inquiry.cultivationName}</span>
              )}
              <h2 className="support-detail-title">{inquiry.title}</h2>
              <span className="support-detail-date">{formatDate(inquiry.createdAt)} 작성</span>
            </div>
            <span className={`support-status-badge support-status-badge--${statusTone(inquiry.status)}`}>
              {statusLabel(inquiry.status)}
            </span>
          </header>

          <div className="support-chat">
            {normalizeList(inquiry.messages).map((message) => (
              <Fragment key={message.id}>
                <div className="support-chat-msg support-chat-msg--user">
                  <span className="support-chat-avatar">나</span>
                  <div className="support-chat-col">
                    <span className="support-chat-name">나</span>
                    <div className="support-chat-bubble">
                      {!message.answerContent &&
                        normalizeList(message.photoUrls).map((url) => (
                          <img
                            alt="첨부 사진"
                            className="support-chat-photo"
                            key={url}
                            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                            src={url}
                          />
                        ))}
                      <span>{message.content}</span>
                    </div>
                    <span className="support-chat-time">{formatDateTime(message.createdAt)}</span>
                  </div>
                </div>
                {message.answerContent && (
                  <div className="support-chat-msg support-chat-msg--admin">
                    <span className="support-chat-avatar support-chat-avatar--admin">관</span>
                    <div className="support-chat-col">
                      <span className="support-chat-name">관리자</span>
                      <div className="support-chat-bubble">
                        {normalizeList(message.photoUrls).map((url) => (
                          <img
                            alt="첨부 사진"
                            className="support-chat-photo"
                            key={url}
                            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                            src={url}
                          />
                        ))}
                        <span>{message.answerContent}</span>
                      </div>
                      <span className="support-chat-time">{formatDateTime(message.createdAt)}</span>
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          <Notice notice={notice} onDismiss={() => setNotice(null)} />
          <AttachChips
            files={files}
            onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
          />
          <form className="support-composer" onSubmit={submitFollowUp}>
            <label className="support-attach-icon-btn" title="사진 첨부 (최대 5장)">
              <Paperclip aria-hidden="true" />
              <input
                accept="image/*"
                hidden
                multiple
                onChange={(event) => {
                  setFiles((current) => addImageFiles(current, [...event.target.files]));
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
            <textarea
              name="content"
              placeholder="답변으로 해결이 안 됐다면, 이어서 질문해보세요"
              required
              rows="1"
            />
            <button
              className="support-composer-send"
              disabled={sending}
              title="질문 추가하기"
              type="submit"
            >
              <Send aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </Modal>
  );
}

export default function SupportPage() {
  const [modal, setModal] = useState(null);
  const [page, setPage] = useState(0);
  const inquiriesQuery = useQuery({
    queryKey: ["my-inquiries", page],
    queryFn: () =>
      request(`/support/inquiries?page=${page}&size=${PAGE_SIZE}`).then(unwrapApiResponse),
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
  const totalPages = Math.max(1, inquiriesQuery.data?.totalPages || 1);

  return (
    <main className="workspace-page support-page">
      <section className="workspace-panel support-list-card">
        <div className="support-topline">
          <div className="support-heading">
            <MessageSquare aria-hidden="true" />
            <span>회원문의</span>
          </div>
          <button
            className="support-add-btn"
            onClick={() => setModal("new")}
            title="새 문의 작성"
            type="button"
          >
            <Plus aria-hidden="true" />
          </button>
        </div>
        <p className="support-desc">
          궁금한 점을 남겨주시면 관리자가 답변드려요.
          <br />
          답변으로 해결이 안 되면 같은 글에 이어서 질문할 수 있어요.
        </p>

        {inquiries.length === 0 ? (
          <div className="support-empty">
            아직 남긴 문의가 없어요. 오른쪽 위 + 버튼으로 첫 문의를 남겨보세요!
          </div>
        ) : (
          <>
            <div className="support-grid">
              {inquiries.map((inquiry) => (
                <button
                  className="support-card-item"
                  key={inquiry.id}
                  onClick={() => setModal(inquiry.id)}
                  type="button"
                >
                  <div className="support-card-top">
                    <span className="support-item-category">{inquiry.categoryName}</span>
                    <span
                      className={`support-status-badge support-status-badge--${statusTone(inquiry.status)}`}
                    >
                      {statusLabel(inquiry.status)}
                    </span>
                  </div>
                  <div className="support-card-title">{inquiry.title}</div>
                  <div className="support-card-foot">
                    <CalendarDays aria-hidden="true" />
                    <span>{formatDate(inquiry.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
            {totalPages > 1 && (
              <nav aria-label="회원문의 페이지" className="support-pagination">
                <button
                  className="support-page-btn"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <span className="support-page-label">
                  {page + 1} / {totalPages}
                </span>
                <button
                  className="support-page-btn"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {modal === "new" && (
        <NewInquiryModal
          categories={normalizeList(categoriesQuery.data)}
          cultivations={normalizeList(cultivationsQuery.data?.cultivationSummaryResponses)}
          onClose={() => setModal(null)}
        />
      )}
      {typeof modal === "number" && <InquiryDetail inquiryId={modal} onClose={() => setModal(null)} />}
    </main>
  );
}
