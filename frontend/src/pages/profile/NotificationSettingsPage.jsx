import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Bell, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { jsonRequest, request } from "../../api/http";
import Modal from "../../components/Modal";
import Notice from "../../components/Notice";
import { ErrorState, LoadingState } from "../../components/PageState";
import { normalizeList } from "../../utils/formatters";

function DiscordEndpointModal({ onClose }) {
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const submit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await jsonRequest("/notifications/endpoints", "POST", {
        displayName: String(values.get("displayName")).trim(),
        destination: String(values.get("destination")).trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ["notification-endpoints"] });
      onClose();
    } catch (error) {
      setNotice({ type: "error", message: error.message });
      setBusy(false);
    }
  };
  return (
    <Modal title="Discord 알림 경로 추가" onClose={onClose}>
      <Notice notice={notice} />
      <form className="form-stack" onSubmit={submit}>
        <label>
          표시 이름
          <input name="displayName" maxLength="100" required />
        </label>
        <label>
          Discord Webhook URL
          <input
            name="destination"
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            required
          />
        </label>
        <button className="button button--primary" type="submit" disabled={busy}>
          추가
        </button>
      </form>
    </Modal>
  );
}

export default function NotificationSettingsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const queryClient = useQueryClient();
  const results = useQueries({
    queries: [
      { queryKey: ["notification-endpoints"], queryFn: () => request("/notifications/endpoints") },
      {
        queryKey: ["notification-subscriptions"],
        queryFn: () => request("/notifications/subscriptions"),
      },
      {
        queryKey: ["notification-types"],
        queryFn: () => request("/notifications/subscription-types"),
      },
      {
        queryKey: ["notification-cultivations"],
        queryFn: () => request("/notifications/cultivations"),
      },
    ],
  });
  const [endpointsQuery, subscriptionsQuery, typesQuery, cultivationsQuery] = results;
  const loading = results.some((result) => result.isLoading);
  const failed = results.find((result) => result.isError);

  const removeEndpoint = async (id) => {
    if (!window.confirm("이 알림 수신 경로를 삭제할까요?")) return;
    try {
      await request(`/notifications/endpoints/${id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["notification-endpoints"] });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  const createTelegramLink = async () => {
    try {
      const session = await request("/notifications/endpoints/telegram-link-sessions", {
        method: "POST",
      });
      window.open(session.deepLink, "_blank", "noopener,noreferrer");
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  const createSubscription = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      await jsonRequest("/notifications/subscriptions", "POST", {
        subscriptionTypeId: Number(values.get("subscriptionTypeId")),
        endpointId: Number(values.get("endpointId")),
        targetId: Number(values.get("targetId")),
      });
      await queryClient.invalidateQueries({ queryKey: ["notification-subscriptions"] });
      event.currentTarget.reset();
      setNotice({ type: "success", message: "알림 구독을 추가했습니다." });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  const toggleSubscription = async (subscription) => {
    try {
      await jsonRequest(`/notifications/subscriptions/${subscription.id}/enabled`, "PATCH", {
        enabled: !subscription.enabled,
      });
      await queryClient.invalidateQueries({ queryKey: ["notification-subscriptions"] });
    } catch (error) {
      setNotice({ type: "error", message: error.message });
    }
  };

  if (loading) return <LoadingState message="알림 설정을 불러오고 있어요." />;
  if (failed)
    return (
      <ErrorState
        error={failed.error}
        onRetry={() => results.forEach((result) => result.refetch())}
      />
    );

  const endpoints = normalizeList(endpointsQuery.data);
  const subscriptions = normalizeList(subscriptionsQuery.data);
  return (
    <main className="workspace-page">
      <section className="workspace-panel">
        <header className="page-heading">
          <div>
            <p className="eyebrow">알림 수신 관리</p>
            <h1>알림 설정</h1>
            <p>재배지 이벤트를 받을 채널과 구독을 관리하세요.</p>
          </div>
        </header>
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
        <section className="settings-grid">
          <article className="panel-card settings-card">
            <header className="panel-card__heading">
              <h2>수신 경로</h2>
              <div>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={createTelegramLink}
                >
                  Telegram 연결 <ExternalLink aria-hidden="true" />
                </button>
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus aria-hidden="true" /> Discord
                </button>
              </div>
            </header>
            <div className="endpoint-list">
              {endpoints.map((endpoint) => (
                <div key={endpoint.id}>
                  <Bell aria-hidden="true" />
                  <span>
                    <strong>{endpoint.displayName}</strong>
                    <small>{endpoint.channelName || endpoint.channelCode}</small>
                  </span>
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    onClick={() => removeEndpoint(endpoint.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              ))}
              {endpoints.length === 0 && <p>등록된 수신 경로가 없습니다.</p>}
            </div>
          </article>
          <article className="panel-card settings-card">
            <header className="panel-card__heading">
              <h2>새 구독 추가</h2>
            </header>
            <form className="form-stack" onSubmit={createSubscription}>
              <label>
                알림 종류
                <select name="subscriptionTypeId" required>
                  <option value="">선택하세요</option>
                  {normalizeList(typesQuery.data).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                재배지
                <select name="targetId" required>
                  <option value="">선택하세요</option>
                  {normalizeList(cultivationsQuery.data).map((item) => (
                    <option key={item.cultivationId} value={item.cultivationId}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                수신 경로
                <select name="endpointId" required>
                  <option value="">선택하세요</option>
                  {endpoints.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.id}>
                      {endpoint.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button button--primary" type="submit">
                구독 추가
              </button>
            </form>
          </article>
        </section>
        <section className="panel-card subscription-list">
          <header className="panel-card__heading">
            <h2>현재 구독</h2>
            <span>{subscriptions.length}개</span>
          </header>
          {subscriptions.map((subscription) => (
            <label key={subscription.id}>
              <span>
                <strong>{subscription.subscriptionName}</strong>
                <small>{subscription.channelCode}</small>
              </span>
              <input
                type="checkbox"
                checked={subscription.enabled}
                onChange={() => toggleSubscription(subscription)}
              />
            </label>
          ))}
          {subscriptions.length === 0 && <p>등록된 알림 구독이 없습니다.</p>}
        </section>
      </section>
      {modalOpen && <DiscordEndpointModal onClose={() => setModalOpen(false)} />}
    </main>
  );
}
