import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  Camera,
  Cpu,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  getSensorTrend,
} from "../../api/cultivations";
import { request, unwrapApiResponse } from "../../api/http";
import { ErrorState, LoadingState } from "../../components/PageState";
import ChatPanel from "../../features/cultivations/ChatPanel";
import CultivationActions from "../../features/cultivations/CultivationActions";
import MemberManager from "../../features/cultivations/MemberManager";
import PhotoManager from "../../features/cultivations/PhotoManager";
import SensorManager from "../../features/cultivations/SensorManager";
import {
  formatDate,
  formatDateTime,
  formatMode,
  formatRole,
  formatSensorType,
  normalizeList,
} from "../../utils/formatters";

function buildSensorOptions(data, latestValues) {
  return normalizeList(data?.sensors?.sensors).flatMap((sensor) =>
    normalizeList(sensor.sensorTypes).map((sensorType) => ({
      key: `${sensor.deviceEui}|${sensorType.type}`,
      latest: latestValues.find(
        (value) => value.deviceEui === sensor.deviceEui && value.sensorType === sensorType.type,
      ),
      sensor,
      sensorType,
      setting: normalizeList(data?.sensors?.environmentSettings).find(
        (setting) => setting.sensorTypeId === sensorType.sensorTypeId,
      ),
    })),
  );
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

function AiReportPanel({ compliance, cultivationName }) {
  return (
    <section
      aria-labelledby="detail-report-tab"
      className="detail-tab-panel"
      id="detail-report-panel"
      role="tabpanel"
    >
      <header className="section-heading ai-report-heading">
        <div>
          <p className="eyebrow">오늘의 재배 분석</p>
          <h2>AI 재배 리포트</h2>
          <p>{cultivationName}의 실제 환경 유지율을 리포트 형태로 정리했습니다.</p>
        </div>
        <span>{formatDate(new Date())}</span>
      </header>

      <section className="report-overview-grid">
        <EnvironmentBriefing compliance={compliance} />
        <CompliancePanel compliance={compliance} />
      </section>

      <article className="panel-card ai-report-insight">
        <Sparkles aria-hidden="true" />
        <div>
          <h2>AI 성장 분석</h2>
          <p>
            센서 기반 일일 요약과 행동 제안을 생성하는 공개 API가 아직 없어 임의의 분석을 표시하지
            않습니다.
          </p>
          <div className="pending-widget">AI 분석 데이터 준비 중</div>
        </div>
      </article>
    </section>
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
          <Bot aria-hidden="true" />
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

export default function CultivationDetailPage() {
  const { cultivationId } = useParams();
  const id = Number(cultivationId);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedKey, setSelectedKey] = useState("");
  const [modal, setModal] = useState(null);

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
  const latestValues = normalizeList(
    latestQuery.data?.latestSensorValueResponses ||
      data?.latestSensorValues?.latestSensorValueResponses,
  );
  const sensorOptions = useMemo(() => buildSensorOptions(data, latestValues), [data, latestValues]);
  const selected = sensorOptions.find((option) => option.key === selectedKey) || sensorOptions[0];
  const trendQuery = useQuery({
    queryKey: selected
      ? cultivationKeys.trend(id, selected.sensor.deviceEui, selected.sensorType.type)
      : ["cultivations", "trend", id, "none"],
    queryFn: () => getSensorTrend(id, selected.sensor.deviceEui, selected.sensorType.type),
    enabled: Boolean(selected) && activeTab === "dashboard",
    staleTime: 30_000,
  });
  const guideQuery = useQuery({
    queryKey: ["mushroom-guide", data?.cultivation?.mushroomId],
    queryFn: () =>
      request(`/cultivations/mushrooms/${data.cultivation.mushroomId}/guide`).then(
        unwrapApiResponse,
      ),
    enabled: Boolean(data?.cultivation?.mushroomId) && activeTab === "dashboard",
    staleTime: 300_000,
  });

  if (detailQuery.isLoading) return <LoadingState message="재배 상세 정보를 불러오고 있어요." />;
  if (detailQuery.isError)
    return <ErrorState error={detailQuery.error} onRetry={detailQuery.refetch} />;

  const cultivation = data.cultivation;
  const photos = normalizeList(data.photos)
    .slice()
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const currentPhoto = photos[0];
  const canManage = cultivation.myRole === "OWNER" || cultivation.myRole === "MANAGER";
  const canOpenActions =
    cultivation.myRole === "OWNER" ||
    (cultivation.myRole === "MANAGER" && cultivation.mode !== "HARVEST");
  const mushroomName = normalizeList(data.mushrooms).find(
    (mushroom) => mushroom.id === cultivation.mushroomId,
  )?.mushroomNameKo;
  const chartPoints = normalizeList(trendQuery.data?.responses).map((point) => ({
    measuredAt: formatDateTime(point.measuredAt),
    value: point.value,
  }));

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
        <button type="button" onClick={() => setModal("photos")}>
          <Camera aria-hidden="true" /> 사진
        </button>
        <button type="button" onClick={() => setModal("sensors")}>
          <Cpu aria-hidden="true" /> 센서
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

        <DetailTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "dashboard" && (
          <section
            aria-labelledby="detail-dashboard-tab"
            className="detail-tab-panel"
            id="detail-dashboard-panel"
            role="tabpanel"
          >
            <section className="dashboard-top-grid">
              <article className="detail-photo panel-card">
                {currentPhoto ? (
                  <img src={currentPhoto.uri} alt={`${cultivation.name} 최신 재배 사진`} />
                ) : (
                  <div className="detail-photo__empty">등록된 재배 사진이 없습니다.</div>
                )}
                <div className="detail-photo__overlay">
                  <span>최근 사진</span>
                  <button type="button" onClick={() => setModal("photos")}>
                    날짜별 보기
                  </button>
                </div>
              </article>
              <EnvironmentBriefing compliance={data.dailyCompliance} />
              <CompliancePanel compliance={data.dailyCompliance} />
            </section>

            <header className="section-heading">
              <div>
                <h2>현재 재배 환경</h2>
                <p>이 재배지에 등록된 센서 측정 항목만 표시합니다.</p>
              </div>
              <span>3초마다 최신값 갱신</span>
            </header>
            <section className="detail-sensor-grid">
              {sensorOptions.map((option) => {
                const value = Number(option.latest?.value);
                const warning =
                  Number.isFinite(value) &&
                  ((option.setting?.thresholdMin != null &&
                    value < Number(option.setting.thresholdMin)) ||
                    (option.setting?.thresholdMax != null &&
                      value > Number(option.setting.thresholdMax)));
                return (
                  <button
                    className={`detail-sensor-card ${selected?.key === option.key ? "selected" : ""}`}
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedKey(option.key)}
                  >
                    <span>
                      {formatSensorType(option.sensorType.type)}
                      <small className={warning ? "warning" : ""}>
                        {option.latest?.value == null ? "수집 중" : warning ? "범위 이탈" : "안정"}
                      </small>
                    </span>
                    <strong>
                      {option.latest?.value ?? "-"}
                      <small>{option.latest?.unit || option.sensorType.valueUnit}</small>
                    </strong>
                    <span>{option.sensor.deviceName}</span>
                  </button>
                );
              })}
              {sensorOptions.length === 0 && (
                <p className="pending-widget">등록된 센서가 없습니다.</p>
              )}
            </section>

            {selected && (
              <section className="trend-layout">
                <article className="panel-card trend-panel">
                  <header className="panel-card__heading">
                    <div>
                      <h2>{formatSensorType(selected.sensorType.type)} 센서 추이</h2>
                      <p>{selected.sensor.deviceName} · 최근 24시간 15분 평균</p>
                    </div>
                    <strong>
                      {selected.latest?.value ?? "-"}{" "}
                      {selected.latest?.unit || selected.sensorType.valueUnit}
                    </strong>
                  </header>
                  <div className="detail-chart">
                    {chartPoints.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartPoints}>
                          <CartesianGrid stroke="rgba(117,91,65,.12)" vertical={false} />
                          <XAxis dataKey="measuredAt" minTickGap={32} tick={{ fontSize: 11 }} />
                          <YAxis width={44} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line
                            dataKey="value"
                            dot={false}
                            isAnimationActive={false}
                            stroke="#708d66"
                            strokeWidth={2.5}
                            type="monotone"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="pending-widget">센서 추이 데이터 준비 중</p>
                    )}
                  </div>
                </article>
                <aside className="panel-card device-panel">
                  <header className="panel-card__heading">
                    <h2>선택 센서 정보</h2>
                    <Settings aria-hidden="true" />
                  </header>
                  <dl>
                    <dt>센서명</dt>
                    <dd>{selected.sensor.deviceName}</dd>
                    <dt>모델</dt>
                    <dd>{selected.sensor.deviceModel || "-"}</dd>
                    <dt>연결 상태</dt>
                    <dd>{selected.sensor.sensorStatus || "-"}</dd>
                    <dt>위치</dt>
                    <dd>{selected.sensor.locationDetail || selected.sensor.location || "-"}</dd>
                  </dl>
                  <div className="pending-widget">최근 알림 기록 · 데이터 준비 중</div>
                </aside>
              </section>
            )}

            <header className="section-heading">
              <div>
                <h2>AI {mushroomName || "버섯"} 가이드</h2>
                <p>버섯 기준 정보와 추천 요리법을 확인합니다.</p>
              </div>
            </header>
            <MushroomGuide
              guide={guideQuery.data}
              error={guideQuery.error}
              onRetry={guideQuery.refetch}
            />
          </section>
        )}

        {activeTab === "report" && (
          <AiReportPanel compliance={data.dailyCompliance} cultivationName={cultivation.name} />
        )}

        {activeTab === "chatbot" && (
          <section
            aria-labelledby="detail-chatbot-tab"
            className="detail-tab-panel"
            id="detail-chatbot-panel"
            role="tabpanel"
          >
            <header className="section-heading chatbot-tab-heading">
              <div>
                <p className="eyebrow">재배 문맥 기반 상담</p>
                <h2>AI 재배 상담</h2>
                <p>기존 재배 챗봇 대화와 현재 재배지 문맥을 이어서 사용합니다.</p>
              </div>
            </header>
            <ChatPanel cultivationId={id} />
          </section>
        )}
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
