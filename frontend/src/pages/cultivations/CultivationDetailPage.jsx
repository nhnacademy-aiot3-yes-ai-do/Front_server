import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Bot,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Cpu,
  History,
  LayoutDashboard,
  MoreHorizontal,
  RefreshCw,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  cultivationKeys,
  getCultivationDetailPage,
  getLatestSensorValues,
} from "../../api/cultivations";
import { request, unwrapApiResponse } from "../../api/http";
import AdminPagination from "../../components/admin/AdminPagination";
import Modal from "../../components/Modal";
import { ErrorState, LoadingState } from "../../components/PageState";
import ChatPanel from "../../features/cultivations/ChatPanel";
import CultivationActions from "../../features/cultivations/CultivationActions";
import { requiresSensorSetup } from "../../features/cultivations/cultivationSetup";
import DailyFeedbackPanel from "../../features/cultivations/DailyFeedbackPanel";
import {
  getPreviousDateInKorea,
  isDailyFeedbackDate,
} from "../../features/cultivations/dailyFeedbackDates";
import MemberManager from "../../features/cultivations/MemberManager";
import PhotoManager from "../../features/cultivations/PhotoManager";
import SensorManager from "../../features/cultivations/SensorManager";
import {
  formatDate,
  formatMode,
  formatRole,
  formatSensorType,
  normalizeList,
  normalizeSensorUnit,
} from "../../utils/formatters";
import { getInsightCandidates, getInsightDetail } from "../../api/insights";

import {
  aggregateChartPoints,
  preferNonEmptyLatestValues,
} from "../../features/cultivations/sensorChartUtils";

function buildSensorOptions(data, latestValues) {
  return normalizeList(data?.sensors?.sensors).flatMap((sensor) =>
    normalizeList(sensor.sensorTypes).map((sensorType) => ({
      key: `${sensor.deviceEui}|${sensorType.type}|${normalizeSensorUnit(sensorType.valueUnit)}`,
      latest: latestValues.find(
        (value) =>
          value.deviceEui === sensor.deviceEui &&
          value.sensorType === sensorType.type &&
          normalizeSensorUnit(value.unit || sensorType.valueUnit) ===
            normalizeSensorUnit(sensorType.valueUnit),
      ),
      sensor,
      sensorType,
      setting: normalizeList(data?.sensors?.environmentSettings).find(
        (setting) => setting.sensorTypeId === sensorType.sensorTypeId,
      ),
    })),
  );
}

const NOTIF_PAGE_SIZE = 8;

function NotificationBellPanel({ onClose }) {
  const [page, setPage] = useState(0);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const notifQuery = useQuery({
    queryKey: ["cultivation-notif-panel", page],
    queryFn: () => request(`/notifications?page=${page}&size=${NOTIF_PAGE_SIZE}`),
  });

  const items = normalizeList(notifQuery.data?.content);
  const totalPages = Math.max(1, notifQuery.data?.totalPages || 1);

  return (
    <div className="dropdown-panel is-open" ref={panelRef}>
      <div className="dropdown-panel-title">알림</div>
      <div className="notif-list">
        {notifQuery.isLoading && <div className="notif-row">불러오는 중...</div>}
        {notifQuery.isError && <div className="notif-row">알림을 불러오지 못했습니다.</div>}
        {!notifQuery.isLoading && !notifQuery.isError && items.length === 0 && (
          <div className="notif-row">알림이 없습니다.</div>
        )}
        {!notifQuery.isLoading &&
          !notifQuery.isError &&
          items.map((item) => (
            <div className="notif-row" key={item.id}>
              {item.message || "(메시지 없음)"}
            </div>
          ))}
      </div>
      {totalPages > 1 && (
        <div className="panel-pagination">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
            aria-label="이전 페이지"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((current) => current + 1)}
            aria-label="다음 페이지"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

const SENSOR_HISTORY_WINDOW_MS = 12 * 60 * 60 * 1000;

function sensorHistoryPointKey(point) {
  return [
    point.deviceEui,
    point.sensorType,
    normalizeSensorUnit(point.unit),
    point.measuredAt,
  ].join("|");
}

function trimSensorHistory(history, now = Date.now()) {
  const normalizedHistory = normalizeList(history);
  const cutoff = now - SENSOR_HISTORY_WINDOW_MS;
  const trimmed = normalizedHistory.filter((point) => {
    const measuredAt = new Date(point.measuredAt).getTime();
    return Number.isFinite(measuredAt) && measuredAt >= cutoff;
  });
  return trimmed.length === normalizedHistory.length ? history : trimmed;
}

function mergeSensorHistory(history, latestValues, now = Date.now()) {
  const normalizedHistory = normalizeList(history);
  const cutoff = now - SENSOR_HISTORY_WINDOW_MS;
  const pointsByKey = new Map();

  [...normalizedHistory, ...normalizeList(latestValues)].forEach((point) => {
    const measuredAt = new Date(point.measuredAt).getTime();
    if (!Number.isFinite(measuredAt) || measuredAt < cutoff) return;
    pointsByKey.set(sensorHistoryPointKey(point), point);
  });

  const merged = [...pointsByKey.values()].sort(
    (left, right) => new Date(left.measuredAt).getTime() - new Date(right.measuredAt).getTime(),
  );
  if (
    merged.length === normalizedHistory.length &&
    merged.every((point, index) => point === normalizedHistory[index])
  ) {
    return history;
  }
  return merged;
}

function sensorRangeLabel(rangeMinutes) {
  return rangeMinutes < 60 ? `최근 ${rangeMinutes}분` : `최근 ${rangeMinutes / 60}시간`;
}

function complianceRows(compliance) {
  return [
    ["온도", compliance?.temperatureCompliance],
    ["습도", compliance?.humidityCompliance],
    ["CO₂", compliance?.co2Compliance],
    ["조도", compliance?.lightCompliance],
  ];
}

function EnvironmentBriefing({ compliance }) {
  const rows = complianceRows(compliance);
  const available = rows.filter(([, value]) => value != null);
  const average = available.length
    ? Math.round(available.reduce((sum, [, value]) => sum + Number(value), 0) / available.length)
    : null;

  return (
    <article className="panel-card environment-briefing">
      <header className="panel-card__heading">
        <h2>오늘의 환경 브리핑</h2>
        <span>실제 유지율 기준</span>
      </header>
      <div className="briefing-score">
        <strong>{average ?? "-"}</strong>
        <span>{average == null ? "환경 데이터를 수집 중입니다." : "오늘 환경 유지율 평균"}</span>
      </div>
      <p>AI 성장 분석과 행동 제안은 데이터 준비 중입니다.</p>
    </article>
  );
}

function CompliancePanel({ compliance }) {
  return (
    <article className="panel-card compliance-panel">
      <header className="panel-card__heading">
        <h2>오늘 환경 유지율</h2>
        <span>00:00–현재</span>
      </header>
      <div className="compliance-list">
        {complianceRows(compliance).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <span className="compliance-bar">
              <i style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} />
            </span>
            <strong>{value == null ? "-" : `${Math.round(Number(value))}%`}</strong>
          </div>
        ))}
      </div>
      <div className="pending-widget">일일 알림 집계 · 데이터 준비 중</div>
    </article>
  );
}

function DetailTabs({ activeTab, onChange }) {
  const tabs = [
    { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
    { id: "report", label: "AI 리포트", icon: Sparkles },
    { id: "chatbot", label: "AI 챗봇", icon: Bot },
  ];

  return (
    <div className="detail-tabs" role="tablist" aria-label="재배 상세 화면">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;

        return (
          <button
            aria-controls={`detail-${tab.id}-panel`}
            aria-selected={selected}
            className={selected ? "active" : ""}
            id={`detail-${tab.id}-tab`}
            key={tab.id}
            role="tab"
            type="button"
            onClick={() => onChange(tab.id)}
          >
            <Icon aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function DailyFeedbackFallbackPage({
  cultivationId,
  feedbackDate,
  maxDate,
  metadataError,
  onDateChange,
  onTabChange,
}) {
  return (
    <main className="detail-page">
      <nav className="detail-toolbar" aria-label="재배 상세 메뉴">
        <Link to="/cultivations">
          <ArrowLeft aria-hidden="true" /> 나의 재배지
        </Link>
      </nav>
      <section className="detail-workspace">
        <header className="detail-heading">
          <div>
            <p className="eyebrow">재배지 #{cultivationId}</p>
            <h1>AI 일일 피드백</h1>
            <p>
              {metadataError
                ? "재배지 기본 정보 없이 일일 피드백을 조회합니다."
                : "재배지 기본 정보를 불러오는 동안 일일 피드백을 먼저 조회합니다."}
            </p>
          </div>
        </header>

        <DetailTabs activeTab="report" onChange={onTabChange} />

        <DailyFeedbackPanel
          cultivationId={cultivationId}
          cultivationName={`재배지 #${cultivationId}`}
          feedbackDate={feedbackDate}
          maxDate={maxDate}
          onFeedbackDateChange={onDateChange}
        />
      </section>
    </main>
  );
}

function HarvestInsightModal({ cultivationId, mushroomName }) {
  const [candidates, setCandidates] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidates = useCallback(() => {
    if (!cultivationId) return;
    setLoading(true);
    setError(null);
    getInsightCandidates(cultivationId)
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : res?.data?.candidates;
        if (Array.isArray(list)) setCandidates(list);
      })
      .catch((err) => {
        console.error("인사이트 조회 실패:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [cultivationId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  if (error) {
    return (
      <div className="pending-widget">
        인사이트 데이터를 불러오지 못했습니다.
        <button className="text-button" type="button" onClick={fetchCandidates}>
          다시 시도
        </button>
      </div>
    );
  }

  if (loading) {
    return <p className="pending-widget">과거 우수 수확 데이터를 분석하고 있습니다.</p>;
  }

  // 상세 분석 보기 (카드 클릭 시)
  if (selectedDetail) {
    const hasTimeline = selectedDetail.dailyTimelines && selectedDetail.dailyTimelines.length > 0;

    return (
      <section
        className={hasTimeline ? "guide-grid" : ""}
        style={{
          width: "100%",
          display: hasTimeline ? undefined : "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <article
          className="panel-card guide-card"
          style={{ width: "100%", boxSizing: "border-box" }}
        >
          <header className="panel-card__heading">
            <div>
              <button
                type="button"
                className="text-button"
                style={{ marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}
                onClick={() => setSelectedDetail(null)}
              >
                ← 추천 목록으로 돌아가기
              </button>
              <h2>{mushroomName || "버섯"} 우수 수확 AI 성공 요인 분석</h2>
              <p
                style={{
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  marginTop: "10px",
                  fontSize: "14px",
                }}
              >
                {selectedDetail.summary}
              </p>
            </div>
          </header>
          <div className="guide-callouts" style={{ marginTop: "16px" }}>
            <div>
              <strong>최종 수확량</strong>
              <p>
                {selectedDetail.harvestWeightGrams != null
                  ? `${Number(selectedDetail.harvestWeightGrams).toLocaleString()} g`
                  : "-"}
              </p>
            </div>
            <div>
              <strong>환경 유지 점수</strong>
              <p>{selectedDetail.growthScore != null ? `${selectedDetail.growthScore}점` : "-"}</p>
            </div>
          </div>
        </article>

        {hasTimeline && (
          <article className="panel-card recipe-card" style={{ boxSizing: "border-box" }}>
            <header className="panel-card__heading">
              <h2>일자별 환경 유지율 이력</h2>
              <span>{selectedDetail.dailyTimelines.length}일간 기록</span>
            </header>
            <div className="recipe-list" style={{ maxHeight: "350px", overflowY: "auto" }}>
              {selectedDetail.dailyTimelines.map((dt) => (
                <details key={dt.targetDate} style={{ marginBottom: "8px" }}>
                  <summary style={{ fontWeight: "bold" }}>📅 {dt.targetDate} 환경 유지율</summary>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      fontSize: "12px",
                      color: "#555",
                      marginTop: "6px",
                    }}
                  >
                    <span>
                      온도:{" "}
                      {dt.compliance?.temperatureRate != null
                        ? `${dt.compliance.temperatureRate}%`
                        : "-"}
                    </span>
                    <span>
                      습도:{" "}
                      {dt.compliance?.humidityRate != null ? `${dt.compliance.humidityRate}%` : "-"}
                    </span>
                    <span>
                      CO₂: {dt.compliance?.co2Rate != null ? `${dt.compliance.co2Rate}%` : "-"}
                    </span>
                    <span>
                      조도: {dt.compliance?.lightRate != null ? `${dt.compliance.lightRate}%` : "-"}
                    </span>
                  </div>
                </details>
              ))}
            </div>
          </article>
        )}
      </section>
    );
  }

  if (candidates.length === 0) {
    return (
      <p className="pending-widget">
        {mushroomName || "해당 버섯"}의 과거 우수 수확 데이터가 아직 충분하지 않습니다.
      </p>
    );
  }

  // 추천 카드 목록 보기
  return (
    <article className="panel-card guide-card" style={{ width: "100%", boxSizing: "border-box" }}>
      <header className="panel-card__heading">
        <div>
          <h2>유사 환경 우수 수확 추천 사례 (TOP {candidates.length})</h2>
          <p>
            카드를 클릭하시면 해당 농가의 AI 성공 분석과 일자별 관리 이력을 확인하실 수 있습니다.
          </p>
        </div>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "12px",
          marginTop: "12px",
        }}
      >
        {candidates.map((c, idx) => {
          const cardId = c.insightId || c.id;
          return (
            <div
              key={cardId || idx}
              onClick={() => getInsightDetail(cardId).then((res) => setSelectedDetail(res.data))}
              style={{
                padding: "16px",
                borderRadius: "10px",
                backgroundColor: "#fff",
                border: "1px solid rgba(112, 141, 102, 0.3)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <strong style={{ color: "#708d66", fontSize: "15px" }}>
                  {idx + 1}위 추천 수확
                </strong>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: "#708d66",
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: "12px",
                  }}
                >
                  환경 {c.growthScore ?? "-"}점
                </span>
              </div>

              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#333" }}>
                {c.harvestWeightGrams != null ? Number(c.harvestWeightGrams).toLocaleString() : "0"}{" "}
                <span style={{ fontSize: "14px", fontWeight: "normal" }}>g 수확</span>
              </div>

              {/* 긴 요약은 2줄로 깔끔하게 말줄임 처리 (따옴표 "vertical" 적용) */}
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: "1.5",
                  color: "#666",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.summary}
              </p>

              {/* 온습도 정보 뱃지 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#555",
                  marginTop: "auto",
                }}
              >
                <span
                  style={{ backgroundColor: "#f3f4f6", padding: "3px 6px", borderRadius: "4px" }}
                >
                  🌡️ {c.avgTemperature != null ? Number(c.avgTemperature).toFixed(1) : "-"}℃
                </span>
                <span
                  style={{ backgroundColor: "#f3f4f6", padding: "3px 6px", borderRadius: "4px" }}
                >
                  💧 {c.avgHumidity != null ? Number(c.avgHumidity).toFixed(1) : "-"}%
                </span>
                <span
                  style={{ backgroundColor: "#f3f4f6", padding: "3px 6px", borderRadius: "4px" }}
                >
                  ☁️ {c.avgCo2 != null ? Number(c.avgCo2).toFixed(0) : "-"}ppm
                </span>
                <span
                  style={{ backgroundColor: "#f3f4f6", padding: "3px 6px", borderRadius: "4px" }}
                >
                  ☀️ {c.avgLight != null ? Number(c.avgLight).toFixed(0) : "-"}lx
                </span>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#708d66",
                  fontWeight: "bold",
                  textAlign: "right",
                }}
              >
                상세 분석 보기 →
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function formatMdpLabel(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${year}. ${month}. ${day}.`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function mdpFormatDate(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function MiniDatePicker({ value, onChange, minDate, maxDate }) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const [view, setView] = useState(() => {
    const [year, month] = (value || maxDate).split("-").map(Number);
    return { year, month: month - 1 };
  });

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (event.target.closest?.("[data-mdp-panel]")) return;
      setOpen(false);
    };
    const handleScroll = (event) => {
      if (event.target?.closest?.("[data-mdp-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const [year, month] = (value || maxDate).split("-").map(Number);
      setView({ year, month: month - 1 });
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 10, left: rect.left });
    }
    setOpen((prev) => !prev);
  };

  const changeMonth = (delta) => {
    setView((prev) => {
      let { year, month } = prev;
      month += delta;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      return { year, month };
    });
  };

  const [minYear, minMonth] = minDate ? minDate.split("-").map(Number) : [null, null];
  const [maxYear, maxMonth] = maxDate.split("-").map(Number);
  const prevDisabled =
    minYear != null &&
    (view.year < minYear || (view.year === minYear && view.month <= minMonth - 1));
  const nextDisabled = view.year > maxYear || (view.year === maxYear && view.month >= maxMonth - 1);

  const firstDayOfWeek = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="mdp">
      <button type="button" className="mdp-trigger" ref={triggerRef} onClick={toggle}>
        <CalendarDays aria-hidden="true" />
        <span>{value ? formatMdpLabel(value) : "최신 사진"}</span>
      </button>
      {open &&
        panelPos &&
        createPortal(
          <div
            className="mdp-panel"
            data-mdp-panel
            style={{ position: "fixed", top: panelPos.top, left: panelPos.left, zIndex: 200 }}
          >
            <div className="mdp-panel-header">
              <button type="button" onClick={() => changeMonth(-1)} disabled={prevDisabled}>
                <ChevronLeft aria-hidden="true" />
              </button>
              <span>
                {view.year}년 {view.month + 1}월
              </span>
              <button type="button" onClick={() => changeMonth(1)} disabled={nextDisabled}>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <div className="mdp-weekdays">
              {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="mdp-days">
              {cells.map((day, index) => {
                if (day == null) {
                  return (
                    <button
                      key={`empty-${index}`}
                      type="button"
                      className="mdp-day mdp-day--other-month"
                      disabled
                    />
                  );
                }
                const dateStr = mdpFormatDate(view.year, view.month, day);
                const disabled = (minDate && dateStr < minDate) || dateStr > maxDate;
                const selected = value === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={`mdp-day${selected ? " mdp-day--selected" : ""}`}
                    disabled={disabled}
                    onClick={() => {
                      onChange(dateStr);
                      setOpen(false);
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function MushroomGuide({ guide, error, onRetry }) {
  if (error) {
    return (
      <div className="pending-widget">
        버섯 가이드를 불러오지 못했습니다.
        <button className="text-button" type="button" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    );
  }
  if (!guide) return <p className="pending-widget">버섯 가이드를 불러오는 중입니다.</p>;
  return (
    <section className="guide-grid">
      <article className="panel-card guide-card">
        <header className="panel-card__heading">
          <div>
            <h2>{guide.mushroomName || "버섯"} 재배 가이드</h2>
            <p>{guide.summary}</p>
          </div>
        </header>
        <div className="guide-callouts">
          <div>
            <strong>주의사항</strong>
            <p>{guide.caution || "등록된 주의사항이 없습니다."}</p>
          </div>
          <div>
            <strong>재배 팁</strong>
            <p>{guide.tip || "등록된 재배 팁이 없습니다."}</p>
          </div>
        </div>
      </article>
      <article className="panel-card recipe-card">
        <header className="panel-card__heading">
          <h2>추천 요리법</h2>
          <span>{normalizeList(guide.recipes).length}개</span>
        </header>
        <div className="recipe-list">
          {normalizeList(guide.recipes).map((recipe) => (
            <details key={recipe.name}>
              <summary>{recipe.name}</summary>
              <p>{recipe.instructions}</p>
            </details>
          ))}
        </div>
      </article>
    </section>
  );
}

const sensorChartColors = ["#708d66", "#b77e3e", "#688da8", "#9a6f8e", "#7f7569"];

function getSensorState(option) {
  const value = Number(option.latest?.value);
  const warning =
    Number.isFinite(value) &&
    ((option.setting?.thresholdMin != null && value < Number(option.setting.thresholdMin)) ||
      (option.setting?.thresholdMax != null && value > Number(option.setting.thresholdMax)));

  if (option.latest?.value == null) return { label: "수집 중", tone: "waiting" };
  if (option.setting?.thresholdMin == null && option.setting?.thresholdMax == null) {
    return { label: "범위 미등록", tone: "unconfigured" };
  }
  if (warning) return { label: "범위 이탈", tone: "warning" };
  return { label: "안정", tone: "stable" };
}

function sensorStateIcon(tone) {
  if (tone === "warning") return "⚠";
  if (tone === "waiting") return "…";
  return "✓";
}

function thresholdLabel(setting, unit) {
  if (!setting || (setting.thresholdMin == null && setting.thresholdMax == null)) {
    return "설정 범위 미등록";
  }
  const min = setting.thresholdMin ?? "하한 없음";
  const max = setting.thresholdMax ?? "상한 없음";
  return `${min}–${max}${unit}`;
}

function LiveSensorCard({ color, option, initialHistory, rangeMinutes }) {
  const state = getSensorState(option);
  const unit = normalizeSensorUnit(option.latest?.unit || option.sensorType.valueUnit);
  const cutoff = Date.now() - rangeMinutes * 60 * 1000;
  const chartPoints = aggregateChartPoints(
    normalizeList(initialHistory)
      .filter((point) => {
        const measuredAt = new Date(point.measuredAt).getTime();
        return Number.isFinite(measuredAt) && measuredAt >= cutoff;
      }),
    rangeMinutes,
  );

  return (
    <article className={`live-sensor-card live-sensor-card--${state.tone}`}>
      <header>
        <div className="live-sensor-card__title">
          <i aria-hidden="true" style={{ backgroundColor: color }} />
          <span>
            <strong>{formatSensorType(option.sensorType.type)}</strong>
            <small>{option.sensor.deviceName}</small>
          </span>
        </div>
        <span className={`sensor-live-state sensor-live-state--${state.tone}`}>
          <span aria-hidden="true">{sensorStateIcon(state.tone)}</span>
          {state.label}
        </span>
      </header>

      <div className="live-sensor-card__reading">
        <strong>{option.latest?.value ?? "-"}</strong>
        <span>{unit}</span>
        <small>{sensorRangeLabel(rangeMinutes)} · 측정값</small>
      </div>
      <div className="live-sensor-card__threshold">
        <Ruler aria-hidden="true" />
        <span>권장 범위</span>
        <strong>{thresholdLabel(option.setting, unit)}</strong>
      </div>

      <div className="live-sensor-chart" aria-label={`${option.sensor.deviceName} 센서 추이`}>
        {chartPoints.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartPoints} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="rgba(117,91,65,.12)" vertical={false} />
              <XAxis dataKey="measuredAt" minTickGap={34} tick={{ fontSize: 10 }} />
              <YAxis width={42} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                dataKey="value"
                dot={false}
                isAnimationActive={false}
                stroke={color}
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : chartPoints.length === 1 ? (
          <p className="pending-widget">측정값 1건만 있어 그래프를 표시할 수 없습니다.</p>
        ) : (
          <p className="pending-widget">선택한 기간의 센서 데이터가 없습니다.</p>
        )}
      </div>

      <dl className="live-sensor-card__meta">
        <div>
          <dt>모델</dt>
          <dd>{option.sensor.deviceModel || "-"}</dd>
        </div>
        <div>
          <dt>연결 상태</dt>
          <dd>{option.sensor.sensorStatus || "-"}</dd>
        </div>
        <div>
          <dt>위치</dt>
          <dd>{option.sensor.locationDetail || option.sensor.location || "-"}</dd>
        </div>
      </dl>
    </article>
  );
}

const SENSOR_PAGE_SIZE = 2;

function RealTimeSensorPanel({ latestQuery, sensorOptions, sensorHistory12h }) {
  const [page, setPage] = useState(0);
  const [selectedRangeMinutes, setSelectedRangeMinutes] = useState(720);
  const [sensorHistory, setSensorHistory] = useState(() => normalizeList(sensorHistory12h));
  const totalPages = Math.max(1, Math.ceil(sensorOptions.length / SENSOR_PAGE_SIZE));

  useEffect(() => {
    setSensorHistory((history) => mergeSensorHistory(history, normalizeList(sensorHistory12h)));
  }, [sensorHistory12h]);

  useEffect(() => {
    const latestValues = latestQuery.data?.latestSensorValueResponses;
    if (!latestValues) return;
    setSensorHistory((history) => mergeSensorHistory(history, latestValues));
  }, [latestQuery.data]);

  useEffect(() => {
    const prune = () => {
      setSensorHistory((history) => trimSensorHistory(history));
    };
    const intervalId = window.setInterval(prune, 3_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  const start = page * SENSOR_PAGE_SIZE;
  const pagedOptions = sensorOptions.slice(start, start + SENSOR_PAGE_SIZE);

  return (
    <section className="panel-card realtime-sensor-panel">
      <header className="section-heading">
        <div>
          <h2>실시간 센서 정보</h2>
        </div>
        <div className="sensor-panel-controls">
          <label htmlFor="sensor-history-range">그래프 기간</label>
          <select
            id="sensor-history-range"
            value={selectedRangeMinutes}
            onChange={(event) => setSelectedRangeMinutes(Number(event.target.value))}
          >
            <option value={10}>최근 10분</option>
            <option value={30}>최근 30분</option>
            <option value={60}>최근 1시간</option>
            <option value={180}>최근 3시간</option>
            <option value={360}>최근 6시간</option>
            <option value={720}>최근 12시간</option>
          </select>
          <button
            aria-label={latestQuery.isFetching ? "센서 최신값 갱신 중" : "센서 최신값 새로고침"}
            className={`sensor-refresh-button ${latestQuery.isFetching ? "is-loading" : ""}`}
            disabled={latestQuery.isFetching}
            onClick={() => latestQuery.refetch()}
            title={latestQuery.isFetching ? "최신값 갱신 중" : "최신값 새로고침"}
            type="button"
          >
            <RefreshCw aria-hidden="true" />
          </button>
          <span
            aria-label={latestQuery.isFetching ? "최신값 갱신 중" : "최신값 갱신 완료"}
            className={`sensor-refresh-state ${latestQuery.isFetching ? "is-loading" : ""}`}
            title={latestQuery.isFetching ? "최신값 갱신 중" : "최신값 갱신 완료"}
          >
            {latestQuery.isFetching ? "↻" : "✓"}
          </span>
        </div>
      </header>

      {latestQuery.isError && (
        <div className="sensor-refresh-notice">
          <span>최신 센서값을 가져오지 못해 마지막으로 확인된 값을 표시합니다.</span>
          <button className="text-button" type="button" onClick={() => latestQuery.refetch()}>
            다시 시도
          </button>
        </div>
      )}

      {sensorOptions.length > 0 ? (
        <>
          <div className="realtime-sensor-grid">
            {pagedOptions.map((option, index) => (
              <LiveSensorCard
                color={sensorChartColors[(start + index) % sensorChartColors.length]}
                key={option.key}
                option={option}
                rangeMinutes={selectedRangeMinutes}
                initialHistory={sensorHistory.filter(
                  (point) =>
                    point.deviceEui === option.sensor.deviceEui &&
                    point.sensorType === option.sensorType.type &&
                    normalizeSensorUnit(point.unit || option.sensorType.valueUnit) ===
                      normalizeSensorUnit(option.latest?.unit || option.sensorType.valueUnit),
                )}
              />
            ))}
          </div>
          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      ) : (
        <p className="pending-widget">등록된 센서가 없습니다.</p>
      )}
    </section>
  );
}

export default function CultivationDetailPage() {
  const { cultivationId, feedbackDate: routeFeedbackDate } = useParams();
  const navigate = useNavigate();
  const id = Number(cultivationId);
  const feedbackMaxDate = getPreviousDateInKorea();
  const [activeTab, setActiveTab] = useState(routeFeedbackDate ? "report" : "dashboard");
  const [selectedFeedbackDate, setSelectedFeedbackDate] = useState(() =>
    isDailyFeedbackDate(routeFeedbackDate) ? routeFeedbackDate : feedbackMaxDate,
  );
  const [modal, setModal] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [photoDateFilter, setPhotoDateFilter] = useState(null);
  const tabPanelRef = useRef(null);
  const [tabPanelHeight, setTabPanelHeight] = useState(0);

  useEffect(() => {
    if (!routeFeedbackDate) return;
    setActiveTab("report");
    if (isDailyFeedbackDate(routeFeedbackDate)) {
      setSelectedFeedbackDate(routeFeedbackDate);
    }
  }, [routeFeedbackDate]);

  useEffect(() => {
    // 대시보드 탭 콘텐츠 높이만 기준으로 삼음 — 챗봇 메시지가 늘어나거나 다른 탭
    // 콘텐츠가 변해도 박스 크기가 같이 늘어나지 않게, 다른 탭에서는 측정하지 않음.
    if (activeTab !== "dashboard") return undefined;
    const node = tabPanelRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (!height) return;
      setTabPanelHeight(height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab]);

  const detailQuery = useQuery({
    queryKey: cultivationKeys.detail(id),
    queryFn: () => getCultivationDetailPage(id),
    enabled: Number.isFinite(id),
  });
  const latestQuery = useQuery({
    queryKey: cultivationKeys.latest(id),
    queryFn: () => getLatestSensorValues(id),
    enabled: Number.isFinite(id) && activeTab === "dashboard",
    refetchInterval: 3_000,
    retry: 1,
  });

  const data = detailQuery.data;
  const latestValues = preferNonEmptyLatestValues(
    latestQuery.data?.latestSensorValueResponses,
    data?.latestSensorValues?.latestSensorValueResponses,
  );
  const sensorOptions = useMemo(() => buildSensorOptions(data, latestValues), [data, latestValues]);

  const guideQuery = useQuery({
    queryKey: ["mushroom-guide", data?.cultivation?.mushroomId],
    queryFn: () =>
      request(`/cultivations/mushrooms/${data.cultivation.mushroomId}/guide`).then(
        unwrapApiResponse,
      ),
    enabled: Boolean(data?.cultivation?.mushroomId),
    staleTime: 300_000,
  });

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    if (nextTab !== "report" && routeFeedbackDate) {
      navigate(`/cultivations/${id}`, { replace: true });
    }
  };

  const handleFeedbackDateChange = (nextDate) => {
    if (!isDailyFeedbackDate(nextDate)) return;
    setSelectedFeedbackDate(nextDate);
    navigate(`/cultivations/${id}/daily-feedbacks/${nextDate}`, { replace: true });
  };

  const handleOpenFeedbackReport = (nextDate) => {
    const targetDate = isDailyFeedbackDate(nextDate) ? nextDate : feedbackMaxDate;
    setSelectedFeedbackDate(targetDate);
    setActiveTab("report");
    navigate(`/cultivations/${id}/daily-feedbacks/${targetDate}`);
  };

  if (routeFeedbackDate && (detailQuery.isLoading || detailQuery.isError || !data?.cultivation)) {
    return (
      <DailyFeedbackFallbackPage
        cultivationId={id}
        feedbackDate={selectedFeedbackDate}
        maxDate={feedbackMaxDate}
        metadataError={detailQuery.isError || (!detailQuery.isLoading && !data?.cultivation)}
        onDateChange={handleFeedbackDateChange}
        onTabChange={handleTabChange}
      />
    );
  }

  if (detailQuery.isLoading) return <LoadingState message="재배 상세 정보를 불러오고 있어요." />;
  if (detailQuery.isError)
    return <ErrorState error={detailQuery.error} onRetry={detailQuery.refetch} />;
  if (!data?.cultivation)
    return (
      <ErrorState
        error={new Error("재배지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")}
        onRetry={detailQuery.refetch}
      />
    );

  const cultivation = data.cultivation;
  const photos = normalizeList(data.photos)
    .slice()
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const currentPhoto = photos[0];
  const photoMinDate = cultivation.startedAt ? String(cultivation.startedAt).slice(0, 10) : null;
  const photoMaxDate = new Date().toISOString().slice(0, 10);
  const displayedPhoto = photoDateFilter
    ? photos.find((photo) => String(photo.updatedAt).slice(0, 10) === photoDateFilter)
    : currentPhoto;
  const canManage = cultivation.myRole === "OWNER" || cultivation.myRole === "MANAGER";
  const canOpenActions =
    cultivation.myRole === "OWNER" ||
    (cultivation.myRole === "MANAGER" && cultivation.mode !== "HARVEST");
  const setupRequired = requiresSensorSetup(cultivation, data?.sensors?.sensors);

  if (setupRequired) {
    return (
      <main className="workspace-page cultivation-setup-required-page">
        <section className="workspace-panel setup-required-state">
          <div className="setup-required-state__icon">
            <Cpu aria-hidden="true" />
          </div>
          <p className="eyebrow">{cultivation.name}</p>
          <h1>센서 연결을 마쳐 주세요</h1>
          <p>
            재배지는 생성됐지만 사용할 센서가 아직 없습니다. 센서를 하나 이상 연결한 뒤 대시보드를
            열 수 있습니다.
          </p>
          <div className="form-actions">
            <Link className="button button--secondary" to="/cultivations">
              나의 재배지
            </Link>
            {canManage && (
              <Link className="button button--primary" to={`/cultivations/${id}/setup`}>
                마저 진행하기 <ChevronRight aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }
  const mushroomName = normalizeList(data.mushrooms).find(
    (mushroom) => mushroom.id === cultivation.mushroomId,
  )?.mushroomNameKo;
  const cultivationStartDate = String(cultivation.startedAt || "").slice(0, 10);
  const feedbackMinDate = isDailyFeedbackDate(cultivationStartDate)
    ? cultivationStartDate
    : undefined;

  return (
    <main className="detail-page">
      <nav className="detail-toolbar" aria-label="재배 상세 메뉴">
        <Link to="/cultivations">
          <ArrowLeft aria-hidden="true" /> 나의 재배지
        </Link>
        <span className="toolbar-spacer" />
        <button type="button" onClick={() => setModal("members")}>
          <Users aria-hidden="true" /> 담당자
        </button>
        <div className="notif-bell-wrap">
          <button type="button" onClick={() => setNotifOpen((open) => !open)}>
            <Bell aria-hidden="true" /> 알림
          </button>
          {notifOpen && <NotificationBellPanel onClose={() => setNotifOpen(false)} />}
        </div>
        <button type="button" onClick={() => setModal("photos")}>
          <Camera aria-hidden="true" /> 사진
        </button>
        <button type="button" onClick={() => setModal("sensors")}>
          <Cpu aria-hidden="true" /> 센서
        </button>
        <button type="button" onClick={() => setModal("guide")}>
          <Bot aria-hidden="true" /> AI 가이드
        </button>
        <button type="button" onClick={() => setModal("insight")}>
          <Sparkles aria-hidden="true" /> AI 인사이트
        </button>
        {canOpenActions && (
          <button type="button" onClick={() => setModal("actions")}>
            <MoreHorizontal aria-hidden="true" /> 관리
          </button>
        )}
      </nav>
      <section className="detail-workspace">
        <header className="detail-heading">
          <div>
            <p className="eyebrow">
              {mushroomName || "버섯"} · {formatRole(cultivation.myRole)}
            </p>
            <h1>{cultivation.name}</h1>
            <p>
              {formatDate(cultivation.startedAt)} 재배 시작 · {formatMode(cultivation.mode)}
            </p>
          </div>
          <div className="detail-heading__badges">
            <span>{formatMode(cultivation.mode)}</span>
            <span>{data.growthDays ? `생육 ${data.growthDays}일차` : "재배일 정보 없음"}</span>
            <span>담당자 {normalizeList(data.members).length}명</span>
          </div>
        </header>

        <DetailTabs activeTab={activeTab} onChange={handleTabChange} />

        <div
          ref={tabPanelRef}
          style={{
            display: "flex",
            flexDirection: "column",
            height: activeTab === "chatbot" ? tabPanelHeight || undefined : undefined,
            minHeight: activeTab === "report" ? tabPanelHeight || undefined : undefined,
          }}
        >
          {activeTab === "dashboard" && (
            <section
              aria-labelledby="detail-dashboard-tab"
              className="detail-tab-panel"
              id="detail-dashboard-panel"
              role="tabpanel"
            >
              <section className="dashboard-top-grid">
                <article className="detail-photo panel-card">
                  {displayedPhoto ? (
                    <img src={displayedPhoto.uri} alt={`${cultivation.name} 재배 사진`} />
                  ) : (
                    <div className="detail-photo__empty">
                      {photoDateFilter
                        ? "이 날짜엔 등록된 사진이 없어요."
                        : "등록된 재배 사진이 없습니다."}
                    </div>
                  )}
                  <div className="detail-photo__overlay">
                    <MiniDatePicker
                      value={photoDateFilter}
                      onChange={setPhotoDateFilter}
                      minDate={photoMinDate}
                      maxDate={photoMaxDate}
                    />
                    {photoDateFilter && (
                      <button
                        type="button"
                        className="detail-photo__reset"
                        title="최신 사진으로"
                        onClick={() => setPhotoDateFilter(null)}
                      >
                        <History aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
                <EnvironmentBriefing compliance={data.dailyCompliance} />
                <CompliancePanel compliance={data.dailyCompliance} />
              </section>

              <DailyFeedbackPanel
                cultivationId={id}
                cultivationName={cultivation.name}
                feedbackDate={feedbackMaxDate}
                maxDate={feedbackMaxDate}
                minDate={feedbackMinDate}
                variant="preview"
                onOpenReport={handleOpenFeedbackReport}
              />

              <RealTimeSensorPanel
                latestQuery={latestQuery}
                sensorOptions={sensorOptions}
                sensorHistory12h={data.sensorHistory12h}
              />
            </section>
          )}

          {activeTab === "report" && (
            <DailyFeedbackPanel
              cultivationId={id}
              cultivationName={cultivation.name}
              feedbackDate={selectedFeedbackDate}
              maxDate={feedbackMaxDate}
              minDate={feedbackMinDate}
              onFeedbackDateChange={handleFeedbackDateChange}
            />
          )}

          {activeTab === "chatbot" && (
            <section
              aria-labelledby="detail-chatbot-tab"
              className="detail-tab-panel"
              id="detail-chatbot-panel"
              role="tabpanel"
            >
              <ChatPanel cultivationId={id} />
            </section>
          )}
        </div>
      </section>

      {modal === "members" && (
        <MemberManager
          cultivationId={id}
          members={normalizeList(data.members)}
          myRole={cultivation.myRole}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "photos" && (
        <PhotoManager
          cultivationId={id}
          photos={photos}
          canManage={canManage}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "sensors" && (
        <SensorManager
          cultivationId={id}
          sensors={data.sensors}
          canManage={canManage}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "guide" && (
        <Modal
          title={`AI ${mushroomName || "버섯"} 가이드`}
          onClose={() => setModal(null)}
          className="modal-card--guide"
        >
          <MushroomGuide
            guide={guideQuery.data}
            error={guideQuery.error}
            onRetry={guideQuery.refetch}
          />
        </Modal>
      )}
      {modal === "insight" && (
        <Modal
          title={`AI ${mushroomName || "버섯"} 인사이트`}
          onClose={() => setModal(null)}
          className="modal-card--guide"
        >
          <HarvestInsightModal cultivationId={id} mushroomName={mushroomName} />
        </Modal>
      )}
      {modal === "actions" && (
        <CultivationActions
          cultivation={cultivation}
          growthDays={data.growthDays}
          pastCultivations={data.pastCultivations}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
