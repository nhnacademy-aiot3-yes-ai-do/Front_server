import {keepPreviousData, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {ImagePlus, MessageSquareReply, Paperclip, Trash2, X} from "lucide-react";
import {useState} from "react";
import {useSearchParams} from "react-router-dom";
import {answerAdminInquiry, deleteAdminInquiryCultivation, getAdminInquiries, getAdminInquiry,} from "../../api/admin";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminTableState from "../../components/admin/AdminTableState";
import {formatDate, formatDateTime} from "../../utils/formatters";

const PAGE_SIZE = 8;
const MAX_PHOTOS = 5;

function statusLabel(status) {
  return status === "RESOLVED" ? "답변 완료" : "답변 대기";
}

function InquiryConversation({ inquiry }) {
  return (
    <div className="admin-inquiry-chat">
      {(inquiry.messages || []).map((message) => {
        const questionPhotos = message.answerContent ? [] : message.photoUrls || [];
        const answerPhotos = message.answerContent ? message.photoUrls || [] : [];
        return (
          <div key={message.id} className="admin-inquiry-exchange">
            <article className="admin-chat-message">
              <span className="admin-chat-avatar" aria-hidden="true">
                유
              </span>
              <div>
                <strong>{inquiry.userNickname}</strong>
                <p>{message.content}</p>
                {!!questionPhotos.length && (
                  <div className="admin-chat-photos">
                    {questionPhotos.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="문의 첨부 사진" />
                      </a>
                    ))}
                  </div>
                )}
                <time>{formatDateTime(message.createdAt)}</time>
              </div>
            </article>
            {message.answerContent && (
              <article className="admin-chat-message admin-chat-message--admin">
                <span className="admin-chat-avatar" aria-hidden="true">
                  관
                </span>
                <div>
                  <strong>관리자</strong>
                  <p>{message.answerContent}</p>
                  {!!answerPhotos.length && (
                    <div className="admin-chat-photos">
                      {answerPhotos.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="답변 첨부 사진" />
                        </a>
                      ))}
                    </div>
                  )}
                  <time>{formatDateTime(message.createdAt)}</time>
                </div>
              </article>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InquiryDetailModal({ inquiryId, onClose, onAnswered }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [notice, setNotice] = useState(null);
  const [confirmCultivationDelete, setConfirmCultivationDelete] = useState(false);
  const detailQuery = useQuery({
    queryKey: ["admin", "inquiry", inquiryId],
    queryFn: () => getAdminInquiry(inquiryId),
  });
  const answerMutation = useMutation({
    mutationFn: ({ answerId }) => answerAdminInquiry(answerId, content.trim(), files),
    onSuccess: (detail) => {
      queryClient.setQueryData(["admin", "inquiry", inquiryId], detail);
      setContent("");
      setFiles([]);
      setNotice({ type: "success", message: "답변을 등록했습니다." });
      onAnswered();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });
  const cultivationDeleteMutation = useMutation({
    mutationFn: (cultivationId) => deleteAdminInquiryCultivation(cultivationId),
    onSuccess: () => {
      queryClient.setQueryData(["admin", "inquiry", inquiryId], (current) => ({
        ...current,
        cultivationId: null,
        cultivationName: null,
      }));
      setConfirmCultivationDelete(false);
      setNotice({ type: "success", message: "문의에 연결된 재배지를 삭제했습니다." });
      onAnswered();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });
  const inquiry = detailQuery.data;
  const lastMessage = inquiry?.messages?.at(-1);
  const canAnswer = inquiry?.status !== "RESOLVED" && lastMessage && !lastMessage.answerContent;

  const addFiles = (incoming) => {
    const images = [...incoming].filter((file) => file.type.startsWith("image/"));
    if (files.length + images.length > MAX_PHOTOS) {
      setNotice({ type: "error", message: `사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.` });
    }
    setFiles((current) => [...current, ...images].slice(0, MAX_PHOTOS));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!content.trim() || !lastMessage) return;
    setNotice(null);
    answerMutation.mutate({ answerId: lastMessage.id });
  };

  return (
    <Modal title="회원 문의 상세" onClose={onClose} className="admin-inquiry-modal">
      {detailQuery.isLoading && <p className="admin-modal-state">문의 내용을 불러오고 있습니다.</p>}
      {detailQuery.isError && (
        <div className="admin-modal-state">
          <p>{detailQuery.error.message}</p>
          <button type="button" onClick={() => detailQuery.refetch()}>
            다시 시도
          </button>
        </div>
      )}
      {inquiry && (
        <>
          <header className="admin-inquiry-detail-header">
            <div>
              <span>{inquiry.categoryName}</span>
              <h3>{inquiry.title}</h3>
              <p>
                {inquiry.userNickname} · {formatDate(inquiry.createdAt)}
              </p>
            </div>
            <span className={`admin-status admin-status--${inquiry.status?.toLowerCase()}`}>
              {statusLabel(inquiry.status)}
            </span>
          </header>
          {inquiry.cultivationId && (
            <div className="admin-cultivation-actions">
              <a
                className="admin-cultivation-link"
                href={`/cultivations/${inquiry.cultivationId}`}
                target="_blank"
                rel="noreferrer"
              >
                재배지: {inquiry.cultivationName || `#${inquiry.cultivationId}`}
              </a>
              <button
                className="admin-cultivation-delete-button"
                type="button"
                onClick={() => setConfirmCultivationDelete(true)}
              >
                <Trash2 aria-hidden="true" /> 재배지 삭제
              </button>
            </div>
          )}
          {confirmCultivationDelete && inquiry.cultivationId && (
            <div className="admin-inline-confirm" role="alert">
              <div>
                <strong>연결된 재배지를 삭제하시겠습니까?</strong>
                <span>삭제한 재배지 정보는 되돌릴 수 없습니다.</span>
              </div>
              <div>
                <button
                  className="admin-secondary-button"
                  type="button"
                  disabled={cultivationDeleteMutation.isPending}
                  onClick={() => setConfirmCultivationDelete(false)}
                >
                  취소
                </button>
                <button
                  className="admin-danger-button"
                  type="button"
                  disabled={cultivationDeleteMutation.isPending}
                  onClick={() => cultivationDeleteMutation.mutate(inquiry.cultivationId)}
                >
                  {cultivationDeleteMutation.isPending ? "삭제 중…" : "삭제"}
                </button>
              </div>
            </div>
          )}
          <InquiryConversation inquiry={inquiry} />
          <Notice notice={notice} onDismiss={() => setNotice(null)} />
          {canAnswer ? (
            <form className="admin-reply-form" onSubmit={submit}>
              <label>
                답변 내용
                <textarea
                  value={content}
                  rows="4"
                  maxLength="2000"
                  required
                  placeholder="회원에게 전달할 답변을 입력하세요."
                  onChange={(event) => setContent(event.target.value)}
                />
              </label>
              {!!files.length && (
                <ul className="admin-file-list">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}`}>
                      <Paperclip aria-hidden="true" />
                      <span>{file.name}</span>
                      <button
                        type="button"
                        aria-label={`${file.name} 첨부 취소`}
                        onClick={() =>
                          setFiles((current) => current.filter((_, item) => item !== index))
                        }
                      >
                        <X aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="admin-reply-actions">
                <label className="admin-file-button">
                  <ImagePlus aria-hidden="true" /> 사진 첨부
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      addFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                <button
                  className="admin-primary-button"
                  type="submit"
                  disabled={!content.trim() || answerMutation.isPending}
                >
                  <MessageSquareReply aria-hidden="true" />
                  {answerMutation.isPending ? "등록 중…" : "답변 등록"}
                </button>
              </div>
            </form>
          ) : (
            <p className="admin-resolved-notice">답변이 완료된 문의입니다.</p>
          )}
        </>
      )}
    </Modal>
  );
}

export default function AdminInquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const inquiryId = Number(searchParams.get("open")) || null;
  const inquiriesQuery = useQuery({
    queryKey: ["admin", "inquiries", status, page],
    queryFn: () =>
      getAdminInquiries({
        status: status === "ALL" ? undefined : status,
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const inquiries = inquiriesQuery.data?.content || [];
  const statusCounts = {
    pending: inquiries.filter((item) => item.status === "PENDING").length,
    resolved: inquiries.filter((item) => item.status === "RESOLVED").length,
  };

  const changeStatus = (event) => {
    setStatus(event.target.value);
    setPage(0);
  };

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="회원 문의"
        description="문의 내역을 확인하고 사진을 첨부해 답변할 수 있습니다."
      />
      <section className="admin-panel">
        <div className="admin-table-toolbar">
          <div>
            <p>
              전체 <strong>{inquiriesQuery.data?.totalElements ?? "-"}</strong>건
            </p>
            <small>
              현재 페이지: 대기 {statusCounts.pending} · 완료 {statusCounts.resolved}
            </small>
          </div>
          <label className="admin-select-label">
            <span>처리 상태</span>
            <select value={status} onChange={changeStatus}>
              <option value="ALL">전체</option>
              <option value="PENDING">답변 대기</option>
              <option value="RESOLVED">답변 완료</option>
            </select>
          </label>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--clickable">
            <thead>
              <tr>
                <th>분류</th>
                <th>제목</th>
                <th>작성자</th>
                <th>작성일</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {(inquiriesQuery.isLoading || inquiriesQuery.isError || inquiries.length === 0) && (
                <AdminTableState
                  colSpan={5}
                  loading={inquiriesQuery.isLoading}
                  error={inquiriesQuery.error}
                  empty="조건에 맞는 문의가 없습니다."
                  onRetry={inquiriesQuery.refetch}
                />
              )}
              {!inquiriesQuery.isLoading &&
                !inquiriesQuery.isError &&
                inquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    tabIndex="0"
                    onClick={() => setSearchParams({ open: inquiry.id })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSearchParams({ open: inquiry.id });
                      }
                    }}
                  >
                    <td>{inquiry.categoryName}</td>
                    <td className="admin-table-title">{inquiry.title}</td>
                    <td>{inquiry.userNickname}</td>
                    <td>{formatDate(inquiry.createdAt)}</td>
                    <td>
                      <span
                        className={`admin-status admin-status--${inquiry.status?.toLowerCase()}`}
                      >
                        {statusLabel(inquiry.status)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={inquiriesQuery.data?.number || page}
          totalPages={inquiriesQuery.data?.totalPages || 1}
          onChange={setPage}
        />
      </section>
      {inquiryId && (
        <InquiryDetailModal
          inquiryId={inquiryId}
          onClose={() => setSearchParams({})}
          onAnswered={() => queryClient.invalidateQueries({ queryKey: ["admin", "inquiries"] })}
        />
      )}
    </div>
  );
}
