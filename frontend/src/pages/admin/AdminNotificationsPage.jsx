import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Pencil, Plus, RotateCcw, Trash2} from "lucide-react";
import {useState} from "react";
import {
    deleteNotificationChannel,
    deleteNotificationEvent,
    deleteNotificationTemplate,
    getNotificationChannels,
    getNotificationEvents,
    getNotificationTemplates,
    restoreNotificationChannel,
    saveNotificationChannel,
    saveNotificationEvent,
    saveNotificationTemplate,
} from "../../api/admin";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminTableState from "../../components/admin/AdminTableState";

const targetLabels = { USER: "사용자", CULTIVATION: "재배", INQUIRY: "문의" };

function EventFormModal({ item, onClose }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(item?.code || "");
  const [displayName, setDisplayName] = useState(item?.displayName || "");
  const [description, setDescription] = useState(item?.description || "");
  const [targetType, setTargetType] = useState(item?.targetType || "USER");
  const [notice, setNotice] = useState(null);
  const mutation = useMutation({
    mutationFn: saveNotificationEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notification-events"] });
      onClose();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });
  return (
    <Modal title={item ? "알림 이벤트 수정" : "새 알림 이벤트"} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            id: item?.id,
            code: code.trim().toUpperCase(),
            displayName: displayName.trim(),
            description: description.trim(),
            targetType,
          });
        }}
      >
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <label>
          이벤트 코드
          <input
            value={code}
            required
            pattern="[A-Z][A-Z0-9_]*"
            placeholder="HARVEST_COMPLETED"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
          <small>영문 대문자, 숫자, 언더바만 사용할 수 있습니다.</small>
        </label>
        <label>
          표시 이름
          <input
            value={displayName}
            required
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <label>
          대상 타입
          <select value={targetType} onChange={(event) => setTargetType(event.target.value)}>
            <option value="USER">사용자</option>
            <option value="CULTIVATION">재배</option>
            <option value="INQUIRY">문의</option>
          </select>
        </label>
        <label>
          설명
          <textarea
            value={description}
            rows="3"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button className="admin-primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TemplateFormModal({ item, events, channels, onClose }) {
  const queryClient = useQueryClient();
  const activeChannels = channels.filter(
    (channel) => !channel.deleted || channel.id === item?.channelTypeId,
  );
  const [eventTypeId, setEventTypeId] = useState(String(item?.eventTypeId || events[0]?.id || ""));
  const [channelTypeId, setChannelTypeId] = useState(
    String(item?.channelTypeId || activeChannels[0]?.id || ""),
  );
  const [version, setVersion] = useState(String(item?.version || 1));
  const [bodyTemplate, setBodyTemplate] = useState(item?.bodyTemplate || "");
  const [notice, setNotice] = useState(null);
  const mutation = useMutation({
    mutationFn: saveNotificationTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notification-templates"] });
      onClose();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });
  return (
    <Modal title={item ? "알림 템플릿 수정" : "새 알림 템플릿"} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            id: item?.id,
            eventTypeId: Number(eventTypeId),
            channelTypeId: Number(channelTypeId),
            version: Number(version),
            bodyTemplate: bodyTemplate.trim(),
          });
        }}
      >
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <div className="admin-form-grid">
          <label>
            이벤트
            <select
              value={eventTypeId}
              required
              onChange={(event) => setEventTypeId(event.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.displayName} ({event.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            채널
            <select
              value={channelTypeId}
              required
              onChange={(event) => setChannelTypeId(event.target.value)}
            >
              {activeChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.displayName} ({channel.code})
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          버전
          <input
            type="number"
            min="1"
            value={version}
            required
            onChange={(event) => setVersion(event.target.value)}
          />
        </label>
        <label>
          템플릿 본문
          <textarea
            value={bodyTemplate}
            rows="6"
            required
            onChange={(event) => setBodyTemplate(event.target.value)}
          />
        </label>
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button className="admin-primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ChannelFormModal({ item, onClose }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(item?.code || "");
  const [displayName, setDisplayName] = useState(item?.displayName || "");
  const [notice, setNotice] = useState(null);
  const mutation = useMutation({
    mutationFn: saveNotificationChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notification-channels"] });
      onClose();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });
  return (
    <Modal title={item ? "알림 채널 수정" : "새 알림 채널"} onClose={onClose}>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate({
            id: item?.id,
            code: code.trim().toUpperCase(),
            displayName: displayName.trim(),
          });
        }}
      >
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <label>
          채널 코드
          <input
            value={code}
            required
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </label>
        <label>
          표시 이름
          <input
            value={displayName}
            required
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button className="admin-primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ title, description, mutationFn, invalidateKey, onClose }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      onClose();
    },
    onError: (error) => setNotice({ type: "error", message: error.message }),
  });
  return (
    <Modal title={title} onClose={onClose}>
      <div className="admin-confirm">
        <p>{description}</p>
        <span>사용 중인 항목은 서버 정책에 따라 삭제되지 않을 수 있습니다.</span>
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={onClose}>
            취소
          </button>
          <button
            className="admin-danger-button"
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "처리 중…" : "삭제"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EventsPanel({ query, onEdit, onDelete }) {
  const items = query.data || [];
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>이벤트 코드</th>
            <th>이름</th>
            <th>대상</th>
            <th>설명</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {(query.isLoading || query.isError || !items.length) && (
            <AdminTableState
              colSpan={5}
              loading={query.isLoading}
              error={query.error}
              empty="등록된 알림 이벤트가 없습니다."
              onRetry={query.refetch}
            />
          )}
          {!query.isLoading &&
            !query.isError &&
            items.map((item) => (
              <tr key={item.id}>
                <td className="admin-code-cell">{item.code}</td>
                <td className="admin-table-title">{item.displayName}</td>
                <td>{targetLabels[item.targetType] || item.targetType}</td>
                <td className="admin-description-cell">{item.description || "-"}</td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" aria-label="이벤트 수정" onClick={() => onEdit(item)}>
                      <Pencil aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="이벤트 삭제" onClick={() => onDelete(item)}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function TemplatesPanel({ query, onEdit, onDelete }) {
  const items = query.data || [];
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>이벤트</th>
            <th>채널</th>
            <th>버전</th>
            <th>본문</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {(query.isLoading || query.isError || !items.length) && (
            <AdminTableState
              colSpan={5}
              loading={query.isLoading}
              error={query.error}
              empty="등록된 템플릿이 없습니다."
              onRetry={query.refetch}
            />
          )}
          {!query.isLoading &&
            !query.isError &&
            items.map((item) => (
              <tr key={item.id}>
                <td className="admin-code-cell">{item.eventTypeCode}</td>
                <td>{item.channelCode}</td>
                <td>v{item.version}</td>
                <td className="admin-description-cell">{item.bodyTemplate}</td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" aria-label="템플릿 수정" onClick={() => onEdit(item)}>
                      <Pencil aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="템플릿 삭제" onClick={() => onDelete(item)}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function ChannelsPanel({ query, onEdit, onDelete, onRestore }) {
  const items = query.data || [];
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>채널 코드</th>
            <th>이름</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {(query.isLoading || query.isError || !items.length) && (
            <AdminTableState
              colSpan={4}
              loading={query.isLoading}
              error={query.error}
              empty="등록된 알림 채널이 없습니다."
              onRetry={query.refetch}
            />
          )}
          {!query.isLoading &&
            !query.isError &&
            items.map((item) => (
              <tr key={item.id}>
                <td className="admin-code-cell">{item.code}</td>
                <td className="admin-table-title">{item.displayName}</td>
                <td>
                  <span
                    className={`admin-status admin-status--${item.deleted ? "deleted" : "active"}`}
                  >
                    {item.deleted ? "비활성" : "활성"}
                  </span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button type="button" aria-label="채널 수정" onClick={() => onEdit(item)}>
                      <Pencil aria-hidden="true" />
                    </button>
                    {item.deleted ? (
                      <button type="button" aria-label="채널 복구" onClick={() => onRestore(item)}>
                        <RotateCcw aria-hidden="true" />
                      </button>
                    ) : (
                      <button type="button" aria-label="채널 삭제" onClick={() => onDelete(item)}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("events");
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const eventsQuery = useQuery({
    queryKey: ["admin", "notification-events"],
    queryFn: getNotificationEvents,
  });
  const templatesQuery = useQuery({
    queryKey: ["admin", "notification-templates"],
    queryFn: getNotificationTemplates,
    enabled: tab === "templates",
  });
  const channelsQuery = useQuery({
    queryKey: ["admin", "notification-channels"],
    queryFn: getNotificationChannels,
  });
  const restoreMutation = useMutation({
    mutationFn: (item) => restoreNotificationChannel(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notification-channels"] });
      setActionNotice({ type: "success", message: "채널을 복구했습니다." });
    },
    onError: (error) => setActionNotice({ type: "error", message: error.message }),
  });
  const currentItems =
    tab === "events"
      ? eventsQuery.data
      : tab === "templates"
        ? templatesQuery.data
        : channelsQuery.data;

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="알림 관리"
        description="알림 이벤트, 메시지 템플릿과 발송 채널을 관리합니다."
        action={
          <button
            className="admin-primary-button"
            type="button"
            disabled={
              tab === "templates" &&
              (!eventsQuery.data?.length ||
                !channelsQuery.data?.some((channel) => !channel.deleted))
            }
            onClick={() => setEditing(null)}
          >
            <Plus aria-hidden="true" /> 새 항목 등록
          </button>
        }
      />
      <section className="admin-panel">
        <div
          className="admin-segmented admin-segmented--wide"
          role="tablist"
          aria-label="알림 관리 구분"
        >
          {[
            { key: "events", label: "이벤트" },
            { key: "templates", label: "템플릿" },
            { key: "channels", label: "채널" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              className={tab === item.key ? "is-active" : undefined}
              onClick={() => {
                setTab(item.key);
                setEditing(undefined);
                setDeleting(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="admin-table-toolbar">
          <p>
            전체 <strong>{currentItems?.length ?? "-"}</strong>개
          </p>
        </div>
        <Notice notice={actionNotice} onDismiss={() => setActionNotice(null)} />
        {tab === "events" && (
          <EventsPanel query={eventsQuery} onEdit={setEditing} onDelete={setDeleting} />
        )}
        {tab === "templates" && (
          <TemplatesPanel query={templatesQuery} onEdit={setEditing} onDelete={setDeleting} />
        )}
        {tab === "channels" && (
          <ChannelsPanel
            query={channelsQuery}
            onEdit={setEditing}
            onDelete={setDeleting}
            onRestore={(item) => restoreMutation.mutate(item)}
          />
        )}
      </section>
      {editing !== undefined && tab === "events" && (
        <EventFormModal item={editing} onClose={() => setEditing(undefined)} />
      )}
      {editing !== undefined && tab === "templates" && (
        <TemplateFormModal
          item={editing}
          events={eventsQuery.data || []}
          channels={channelsQuery.data || []}
          onClose={() => setEditing(undefined)}
        />
      )}
      {editing !== undefined && tab === "channels" && (
        <ChannelFormModal item={editing} onClose={() => setEditing(undefined)} />
      )}
      {deleting && tab === "events" && (
        <DeleteModal
          title="알림 이벤트 삭제"
          description={`${deleting.displayName} 이벤트를 삭제하시겠습니까?`}
          mutationFn={() => deleteNotificationEvent(deleting.id)}
          invalidateKey={["admin", "notification-events"]}
          onClose={() => setDeleting(null)}
        />
      )}
      {deleting && tab === "templates" && (
        <DeleteModal
          title="알림 템플릿 삭제"
          description={`${deleting.eventTypeCode} / ${deleting.channelCode} 템플릿을 삭제하시겠습니까?`}
          mutationFn={() => deleteNotificationTemplate(deleting.id)}
          invalidateKey={["admin", "notification-templates"]}
          onClose={() => setDeleting(null)}
        />
      )}
      {deleting && tab === "channels" && (
        <DeleteModal
          title="알림 채널 비활성화"
          description={`${deleting.displayName} 채널을 비활성화하시겠습니까?`}
          mutationFn={() => deleteNotificationChannel(deleting.id)}
          invalidateKey={["admin", "notification-channels"]}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
