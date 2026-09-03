import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Check, Hash, Send, Sparkles, Sprout, Thermometer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { jsonRequest, request } from "../../api/http";
import Modal from "../../components/Modal";
import { ErrorState, LoadingState } from "../../components/PageState";
import { normalizeList } from "../../utils/formatters";

const EVENT_GROUPS = {
  sensor: [
    "ENVIRONMENT_THRESHOLD_BREACHED",
    "ENVIRONMENT_RECOVERED",
    "SENSOR_OFFLINE",
    "SENSOR_ERROR",
  ],
  harvest: ["HARVEST_COMPLETED", "CULTIVATION_FINISHED"],
  ai: ["DAILY_FEEDBACK_COMPLETED"],
};

const CATEGORY_META = [
  {
    key: "sensor",
    icon: Thermometer,
    title: "센서 임계치 초과 알림",
    desc: "온도·습도 등 센서 값이 설정 범위를 벗어나면 알려드려요.",
  },
  {
    key: "harvest",
    icon: Sprout,
    title: "수확·재배 완료 알림",
    desc: "재배가 종료되거나 수확이 등록되면 알려드려요.",
  },
  {
    key: "ai",
    icon: Sparkles,
    title: "AI 리포트 완료 알림",
    desc: "AI 버섯 정보 요약이 준비되면 알려드려요.",
  },
];

function isDiscordWebhookUrl(url) {
  try {
    const parsed = new URL(url);
    const host = (parsed.hostname || "").toLowerCase();
    return (
      parsed.protocol === "https:" &&
      (host === "discord.com" || host === "discordapp.com" || host.endsWith(".discord.com")) &&
      parsed.pathname.startsWith("/api/webhooks/") &&
      !parsed.username
    );
  } catch {
    return false;
  }
}

function DiscordEndpointModal({ endpoint, onClose, onSaved }) {
  const isUpdate = Boolean(endpoint?.id);
  const [step, setStep] = useState("form");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const displayName = String(values.get("displayName")).trim();
    const destination = String(values.get("destination")).trim();
    if (!displayName) {
      setFormError("이름을 입력해주세요.");
      return;
    }
    if (!destination) {
      setFormError("Webhook URL을 입력해주세요.");
      return;
    }
    if (!isDiscordWebhookUrl(destination)) {
      setFormError("https://discord.com/api/webhooks/ 형식의 URL만 사용할 수 있어요.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (isUpdate) {
        await jsonRequest(`/notifications/endpoints/${endpoint.id}`, "PATCH", {
          displayName,
          destination,
        });
      } else {
        await jsonRequest("/notifications/endpoints", "POST", { displayName, destination });
      }
      await onSaved();
      setStep("success");
    } catch (error) {
      setFormError(error.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={isUpdate ? "디스코드 웹후크 수정" : "디스코드 연동하기"} onClose={onClose}>
      {step === "form" ? (
        <form className="form-stack" onSubmit={submit}>
          <div className="integration-modal-icon discord">
            <Hash aria-hidden="true" />
          </div>
          <p className="modal-desc">
            채널 설정 → 연동 → 웹후크에서 URL을 복사해 붙여넣으면 알림을 받을 수 있어요.
          </p>
          <label className="settings-field-label" htmlFor="discord-display-name">
            이름
          </label>
          <input
            className="integration-code-input"
            id="discord-display-name"
            name="displayName"
            defaultValue={endpoint?.displayName || "디스코드 알림"}
            maxLength="100"
            autoComplete="off"
          />
          <label className="settings-field-label" htmlFor="discord-webhook-url">
            Webhook URL
          </label>
          <input
            className="integration-code-input"
            id="discord-webhook-url"
            name="destination"
            type="password"
            maxLength="500"
            placeholder="https://discord.com/api/webhooks/..."
            autoComplete="off"
          />
          {formError && <p className="help-text error">{formError}</p>}
          <div className="modal-actions">
            <button className="button button--secondary" type="button" onClick={onClose}>
              취소
            </button>
            <button className="button button--primary" type="submit" disabled={busy}>
              연결하기
            </button>
          </div>
        </form>
      ) : (
        <div className="modal-success">
          <div
            className="delete-warning-icon"
            style={{ background: "var(--sage-200)", color: "var(--sage-700)" }}
          >
            <Check aria-hidden="true" />
          </div>
          <h3 className="modal-title">디스코드 연결 완료</h3>
          <p className="modal-desc">
            이제 아래 알림 유형과 재배지를 켜면 이 웹후크로 알림을 받아요.
          </p>
          <div className="modal-actions" style={{ justifyContent: "center" }}>
            <button className="button button--primary" type="button" onClick={onClose}>
              확인
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function NotificationSettingsPage() {
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

  const [selectedEndpointId, setSelectedEndpointId] = useState(null);
  const [pendingGroups, setPendingGroups] = useState({});
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [discordModal, setDiscordModal] = useState(null);
  const [telegramConnecting, setTelegramConnecting] = useState(false);
  const telegramPollRef = useRef(null);
  const telegramPopupWatchRef = useRef(null);

  useEffect(
    () => () => {
      clearTimeout(telegramPollRef.current);
      clearTimeout(telegramPopupWatchRef.current);
    },
    [],
  );

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notification-endpoints"] }),
      queryClient.invalidateQueries({ queryKey: ["notification-subscriptions"] }),
    ]);

  const showSaveStatus = (message, isError) => {
    setSaveStatus({ message: message || (isError ? "저장 실패" : "저장됨"), error: !!isError });
  };

  useEffect(() => {
    if (!saveStatus) return undefined;
    const timer = setTimeout(() => setSaveStatus(null), 1600);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  const endpoints = normalizeList(endpointsQuery.data);
  const subscriptions = normalizeList(subscriptionsQuery.data);
  const subscriptionTypes = normalizeList(typesQuery.data);
  const cultivations = normalizeList(cultivationsQuery.data);

  const telegramEndpoint = endpoints.find((e) => e.channelCode === "TELEGRAM" && e.enabled) || null;
  const discordCandidates = endpoints.filter((e) => e.channelCode === "DISCORD");
  const discordEndpoint = discordCandidates.find((e) => e.enabled) || discordCandidates[0] || null;
  const availableEndpoints = useMemo(
    () => [telegramEndpoint, discordEndpoint].filter((e) => e && e.id && e.enabled !== false),
    [telegramEndpoint, discordEndpoint],
  );
  const selectedEndpoint =
    availableEndpoints.find((e) => String(e.id) === String(selectedEndpointId)) ||
    availableEndpoints[0] ||
    null;

  const typesForGroup = (groupKey) => {
    const codes = EVENT_GROUPS[groupKey] || [];
    return subscriptionTypes.filter(
      (t) => t.targetType === "CULTIVATION" && codes.includes(t.eventType),
    );
  };

  const enabledSubscriptionsForSelected = () => {
    if (!selectedEndpoint) return [];
    return subscriptions.filter(
      (s) => s.enabled && String(s.endpointId) === String(selectedEndpoint.id),
    );
  };

  const isCategoryOn = (groupKey) => {
    const typeIds = typesForGroup(groupKey).map((t) => Number(t.id));
    return enabledSubscriptionsForSelected().some((s) =>
      typeIds.includes(Number(s.subscriptionTypeId)),
    );
  };

  const isCultivationOn = (cultivationId) =>
    enabledSubscriptionsForSelected().some(
      (s) => s.targetType === "CULTIVATION" && Number(s.targetId) === Number(cultivationId),
    );

  const pendingForSelected = (selectedEndpoint && pendingGroups[selectedEndpoint.id]) || {};
  const isCategoryChecked = (groupKey) => isCategoryOn(groupKey) || !!pendingForSelected[groupKey];
  const selectedGroups = ["sensor", "harvest", "ai"].filter(isCategoryChecked);
  const hasSelectedType = selectedGroups.length > 0;
  const checkedCultivationIds = cultivations
    .filter((c) => isCultivationOn(c.cultivationId))
    .map((c) => Number(c.cultivationId));

  const findSubscription = (typeId, cultivationId, endpointId) =>
    subscriptions.find(
      (s) =>
        Number(s.subscriptionTypeId) === Number(typeId) &&
        Number(s.targetId) === Number(cultivationId) &&
        Number(s.endpointId) === Number(endpointId),
    ) || null;

  const ensureSubscription = async (typeId, cultivationId, endpoint) => {
    const existing = findSubscription(typeId, cultivationId, endpoint.id);
    if (existing && existing.enabled) return;
    if (existing) {
      await jsonRequest(`/notifications/subscriptions/${existing.id}/enabled`, "PATCH", {
        enabled: true,
      });
      return;
    }
    await jsonRequest("/notifications/subscriptions", "POST", {
      subscriptionTypeId: Number(typeId),
      endpointId: Number(endpoint.id),
      targetId: Number(cultivationId),
    });
  };

  const disableSubscription = async (item) => {
    if (!item || !item.enabled) return;
    await jsonRequest(`/notifications/subscriptions/${item.id}/enabled`, "PATCH", {
      enabled: false,
    });
  };

  const ensureGroupForTargets = async (groupKey, targetIds, endpoint) => {
    const types = typesForGroup(groupKey);
    for (const targetId of targetIds) {
      for (const type of types) {
        await ensureSubscription(type.id, targetId, endpoint);
      }
    }
  };

  const disableGroup = async (groupKey, endpoint) => {
    const typeIds = typesForGroup(groupKey).map((t) => Number(t.id));
    const targets = subscriptions.filter(
      (s) =>
        s.enabled &&
        Number(s.endpointId) === Number(endpoint.id) &&
        typeIds.includes(Number(s.subscriptionTypeId)),
    );
    for (const item of targets) {
      await disableSubscription(item);
    }
  };

  const disableTarget = async (cultivationId, endpoint) => {
    const targets = subscriptions.filter(
      (s) =>
        s.enabled &&
        Number(s.endpointId) === Number(endpoint.id) &&
        s.targetType === "CULTIVATION" &&
        Number(s.targetId) === Number(cultivationId),
    );
    for (const item of targets) {
      await disableSubscription(item);
    }
  };

  const runSaving = async (task) => {
    setBusy(true);
    try {
      await task();
      await invalidateAll();
      showSaveStatus("저장됨", false);
    } catch (error) {
      showSaveStatus(error.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleCategoryToggle = (key, checked) => {
    if (!selectedEndpoint) {
      showSaveStatus("Telegram 또는 디스코드를 먼저 연결해주세요.", true);
      return;
    }
    const endpointId = selectedEndpoint.id;
    if (checked) {
      if (checkedCultivationIds.length === 0) {
        setPendingGroups((prev) => ({
          ...prev,
          [endpointId]: { ...prev[endpointId], [key]: true },
        }));
        return;
      }
      runSaving(() => ensureGroupForTargets(key, checkedCultivationIds, selectedEndpoint)).then(
        () => {
          setPendingGroups((prev) => {
            const next = { ...(prev[endpointId] || {}) };
            delete next[key];
            return { ...prev, [endpointId]: next };
          });
        },
      );
      return;
    }
    setPendingGroups((prev) => {
      const next = { ...(prev[endpointId] || {}) };
      delete next[key];
      return { ...prev, [endpointId]: next };
    });
    if (!isCategoryOn(key)) return;
    runSaving(() => disableGroup(key, selectedEndpoint));
  };

  const handleCultivationToggle = (cultivationId, checked) => {
    if (!selectedEndpoint) {
      showSaveStatus("Telegram 또는 디스코드를 먼저 연결해주세요.", true);
      return;
    }
    if (!checked) {
      runSaving(() => disableTarget(cultivationId, selectedEndpoint));
      return;
    }
    if (selectedGroups.length === 0) {
      showSaveStatus("알림 유형을 먼저 켜주세요.", true);
      return;
    }
    const endpointId = selectedEndpoint.id;
    const groups = selectedGroups;
    runSaving(async () => {
      for (const key of groups) {
        await ensureGroupForTargets(key, [cultivationId], selectedEndpoint);
      }
    }).then(() => {
      setPendingGroups((prev) => {
        const next = { ...(prev[endpointId] || {}) };
        groups.forEach((key) => delete next[key]);
        return { ...prev, [endpointId]: next };
      });
    });
  };

  const stopTelegramPolling = () => {
    clearTimeout(telegramPollRef.current);
    clearTimeout(telegramPopupWatchRef.current);
    telegramPollRef.current = null;
    telegramPopupWatchRef.current = null;
  };

  const handleTelegramConnect = () => {
    if (telegramConnecting) return;
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setTelegramConnecting(true);
    request("/notifications/endpoints/telegram-link-sessions", { method: "POST" })
      .then((session) => {
        if (!session || !session.sessionId || !session.deepLink) {
          throw new Error("Telegram 연결 링크를 만들지 못했습니다.");
        }
        if (popup && !popup.closed) {
          popup.location.replace(session.deepLink);
        } else {
          window.location.assign(session.deepLink);
        }
        const deadline = Date.parse(session.expiresAt);
        const poll = () => {
          if (popup && popup.closed) {
            stopTelegramPolling();
            setTelegramConnecting(false);
            showSaveStatus("Telegram 창이 닫혔습니다.", true);
            return;
          }
          if (!Number.isNaN(deadline) && Date.now() >= deadline) {
            stopTelegramPolling();
            setTelegramConnecting(false);
            showSaveStatus("Telegram 연동 시간이 만료되었습니다. 다시 시도해주세요.", true);
            return;
          }
          request(
            `/notifications/endpoints/telegram-link-sessions/${encodeURIComponent(session.sessionId)}`,
          )
            .then((status) => {
              if (status && status.status === "LINKED") {
                stopTelegramPolling();
                setTelegramConnecting(false);
                showSaveStatus("Telegram 연결이 완료되었습니다.", false);
                queryClient.invalidateQueries({ queryKey: ["notification-endpoints"] });
                return;
              }
              if (status && status.status === "EXPIRED") {
                stopTelegramPolling();
                setTelegramConnecting(false);
                showSaveStatus("Telegram 연동 시간이 만료되었습니다. 다시 시도해주세요.", true);
                return;
              }
              telegramPollRef.current = setTimeout(poll, 2000);
            })
            .catch(() => {
              telegramPollRef.current = setTimeout(poll, 4000);
            });
        };
        poll();
      })
      .catch((error) => {
        if (popup && !popup.closed) popup.close();
        setTelegramConnecting(false);
        showSaveStatus(error.message, true);
      });
  };

  const handleDiscordDisconnect = () => {
    if (!discordEndpoint || !discordEndpoint.id) return;
    if (!window.confirm("디스코드 연결을 해제할까요? 이 경로로 가던 구독도 함께 비활성화됩니다."))
      return;
    runSaving(() =>
      request(`/notifications/endpoints/${discordEndpoint.id}`, { method: "DELETE" }),
    );
  };

  if (loading) return <LoadingState message="알림 설정을 불러오고 있어요." />;
  if (failed)
    return (
      <ErrorState
        error={failed.error}
        onRetry={() => results.forEach((result) => result.refetch())}
      />
    );

  let subscriptionHint = "켠 유형의 알림을 선택한 재배지로 받아요.";
  if (!selectedEndpoint) {
    subscriptionHint = "알림을 받으려면 먼저 Telegram 또는 디스코드를 연결해주세요.";
  } else if (cultivations.length === 0) {
    subscriptionHint = "참여 중인 재배지가 있으면 재배지별로 알림을 켤 수 있어요.";
  } else if (!hasSelectedType) {
    subscriptionHint = "알림 유형을 먼저 켠 다음, 받을 재배지를 선택하세요.";
  } else if (Object.keys(pendingForSelected).length > 0 && checkedCultivationIds.length === 0) {
    subscriptionHint = "받을 재배지를 켜면 서버에 저장됩니다.";
  }

  return (
    <main className="workspace-page">
      <section className="settings-page-wrap">
        <article className="panel-card settings-card">
          <div className="settings-head">
            <h1 className="settings-title">알림 설정</h1>
            <span
              className={`settings-save-status${saveStatus ? " show" : ""}${saveStatus?.error ? " error" : ""}`}
            >
              {saveStatus?.message}
            </span>
          </div>

          <section className="settings-section">
            <h2 className="settings-section-title">연동 채널</h2>
            <div className="integration-list">
              <div className="settings-row">
                <div className="settings-row-icon integration-icon telegram">
                  <Send aria-hidden="true" />
                </div>
                <div className="settings-row-info">
                  <span className="settings-row-title">텔레그램</span>
                  <span className={`settings-row-status${telegramEndpoint ? " connected" : ""}`}>
                    {telegramConnecting
                      ? "Telegram에서 Start를 눌러주세요"
                      : telegramEndpoint
                        ? "연결됨"
                        : "연결 안 됨"}
                  </span>
                </div>
                <div className="settings-row-action">
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={busy || Boolean(telegramEndpoint) || telegramConnecting}
                    onClick={handleTelegramConnect}
                  >
                    {telegramEndpoint ? "연결됨" : "Telegram에서 연결"}
                  </button>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-icon integration-icon discord">
                  <Hash aria-hidden="true" />
                </div>
                <div className="settings-row-info">
                  <span className="settings-row-title">디스코드</span>
                  <span className={`settings-row-status${discordEndpoint ? " connected" : ""}`}>
                    {discordEndpoint
                      ? `연결됨 · ${discordEndpoint.displayName || "디스코드"}`
                      : "연결 안 됨"}
                  </span>
                </div>
                <div className="settings-row-action">
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={busy}
                    onClick={
                      discordEndpoint
                        ? handleDiscordDisconnect
                        : () => setDiscordModal({ endpoint: null })
                    }
                  >
                    {discordEndpoint ? "연결 해제" : "연결하기"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h2 className="settings-section-title">알림 유형</h2>
            <label className="settings-field-label" htmlFor="notification-channel-select">
              설정할 알림 채널
            </label>
            <select
              className="integration-code-input"
              id="notification-channel-select"
              value={selectedEndpoint?.id ?? ""}
              disabled={busy || availableEndpoints.length === 0}
              onChange={(event) => setSelectedEndpointId(event.target.value)}
            >
              {availableEndpoints.length === 0 && <option>연결된 채널이 없습니다</option>}
              {availableEndpoints.map((endpoint) => (
                <option key={endpoint.id} value={endpoint.id}>
                  {endpoint.channelCode === "TELEGRAM" ? "Telegram" : "Discord"}
                </option>
              ))}
            </select>
            <p className="settings-section-desc">{subscriptionHint}</p>

            {CATEGORY_META.map(({ key, icon: Icon, title, desc }) => (
              <div className="settings-row" key={key}>
                <div className="settings-row-icon">
                  <Icon aria-hidden="true" />
                </div>
                <div className="settings-row-text">
                  <span className="settings-row-title">{title}</span>
                  <span className="settings-row-desc">{desc}</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isCategoryChecked(key)}
                    disabled={busy || !selectedEndpoint}
                    onChange={(event) => handleCategoryToggle(key, event.target.checked)}
                  />
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                </label>
              </div>
            ))}
          </section>

          <section className="settings-section settings-section-scroll">
            <h2 className="settings-section-title">재배지별 알림</h2>
            <p className="settings-section-desc">
              알림 유형을 먼저 켠 뒤, 받을 재배지만 켜주세요. 유형만 켜면 아직 저장되지 않습니다.
            </p>
            {cultivations.length === 0 ? (
              <p className="settings-empty">참여 중인 재배지가 없어요.</p>
            ) : (
              cultivations.map((item) => (
                <div className="settings-row" key={item.cultivationId}>
                  <div className="settings-row-icon">
                    <Sprout aria-hidden="true" />
                  </div>
                  <span className="settings-row-name">
                    {item.name || `재배지 ${item.cultivationId}`}
                  </span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={isCultivationOn(item.cultivationId)}
                      disabled={busy || !selectedEndpoint || !hasSelectedType}
                      onChange={(event) =>
                        handleCultivationToggle(item.cultivationId, event.target.checked)
                      }
                    />
                    <span className="toggle-track">
                      <span className="toggle-thumb" />
                    </span>
                  </label>
                </div>
              ))
            )}
          </section>
        </article>
      </section>

      {discordModal && (
        <DiscordEndpointModal
          endpoint={discordModal.endpoint}
          onClose={() => setDiscordModal(null)}
          onSaved={invalidateAll}
        />
      )}
    </main>
  );
}
