import { useQuery } from "@tanstack/react-query";
import { Bell, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cultivationKeys,
  getCultivationListPage,
  getLatestSensorValuesForCultivations,
} from "../../api/cultivations";
import { NotificationBellPanel } from "./CultivationDetailPage";
import AdminPagination from "../../components/admin/AdminPagination";
import { EmptyState, ErrorState, LoadingState } from "../../components/PageState";
import CultivationCard from "../../features/cultivations/CultivationCard";
import { normalizeList, normalizeSensorUnit } from "../../utils/formatters";

const PAGE_SIZE = 6;
const SENSOR_TREND_WINDOW_MS = 60 * 60 * 1000;

function sensorPointKey(point) {
  const deviceIdentity = point.deviceEui || point.sensorId || point.sensorKey;
  if (!deviceIdentity) return null;

  return [deviceIdentity, point.sensorType || "", normalizeSensorUnit(point.unit)].join("|");
}

function mergeSensorTrendMap(previous, incoming) {
  const next = { ...previous };

  Object.entries(incoming || {}).forEach(([cultivationId, points]) => {
    const mergedBySensor = new Map();
    [...normalizeList(next[cultivationId]), ...normalizeList(points)].forEach((point) => {
      if (!point?.measuredAt || point.value == null) return;

      const measuredAt = new Date(point.measuredAt).getTime();
      if (!Number.isFinite(measuredAt)) return;

      const sensorKey = sensorPointKey(point);
      if (!sensorKey) return;

      const sensorPoints = mergedBySensor.get(sensorKey) || new Map();
      sensorPoints.set(String(measuredAt), point);
      mergedBySensor.set(sensorKey, sensorPoints);
    });

    next[cultivationId] = [...mergedBySensor.values()]
      .flatMap((sensorPoints) => {
        const pointsForSensor = [...sensorPoints.values()].sort(
          (left, right) => new Date(left.measuredAt) - new Date(right.measuredAt),
        );
        const newestMeasuredAt = new Date(
          pointsForSensor.at(-1)?.measuredAt,
        ).getTime();
        return pointsForSensor.filter(
          (point) =>
            newestMeasuredAt - new Date(point.measuredAt).getTime() <= SENSOR_TREND_WINDOW_MS,
        );
      })
      .sort((left, right) => new Date(left.measuredAt) - new Date(right.measuredAt));
  });

  return next;
}

export default function CultivationListPage() {
  const listQuery = useQuery({
    queryKey: cultivationKeys.list(),
    queryFn: getCultivationListPage,
  });
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  const cultivations = normalizeList(listQuery.data?.cultivations);
  const latestQuery = useQuery({
    queryKey: cultivationKeys.latestBatch(),
    queryFn: getLatestSensorValuesForCultivations,
    enabled: !listQuery.isLoading && !listQuery.isError && cultivations.length > 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const [trendByCultivationId, setTrendByCultivationId] = useState({});

  const initialTrend = listQuery.data?.["sensorTrend1hByCultivationId"];
  useEffect(() => {
    if (initialTrend) {
      setTrendByCultivationId((previous) => mergeSensorTrendMap(previous, initialTrend));
    }
  }, [initialTrend]);

  useEffect(() => {
    const latestValues = latestQuery.data?.latestSensorValuesByCultivationId;
    if (latestValues) {
      setTrendByCultivationId((previous) => mergeSensorTrendMap(previous, latestValues));
    }
  }, [latestQuery.data?.latestSensorValuesByCultivationId]);

  const mushrooms = new Map(
    normalizeList(listQuery.data?.mushrooms).map((mushroom) => [
      mushroom.id,
      mushroom.mushroomNameKo,
    ]),
  );
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
  const filteredCultivations = normalizedSearchTerm
    ? cultivations.filter((cultivation) => {
        const cultivationName = String(cultivation.name || "").toLocaleLowerCase();
        const mushroomName = String(
          mushrooms.get(cultivation.mushroomId) || "",
        ).toLocaleLowerCase();
        return (
          cultivationName.includes(normalizedSearchTerm) ||
          mushroomName.includes(normalizedSearchTerm)
        );
      })
    : cultivations;
  const totalPages = Math.max(1, Math.ceil(filteredCultivations.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  if (listQuery.isLoading) return <LoadingState message="나의 재배지를 불러오고 있어요." />;
  if (listQuery.isError) return <ErrorState error={listQuery.error} onRetry={listQuery.refetch} />;

  const latestValuesByCultivationId = latestQuery.data?.latestSensorValuesByCultivationId;
  const initialLatestValuesByCultivationId =
    listQuery.data?.latestSensorValuesByCultivationId ?? {};
  const visiblePage = Math.min(page, totalPages - 1);
  const pagedCultivations = filteredCultivations.slice(
    visiblePage * PAGE_SIZE,
    visiblePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <main className="workspace-page cultivation-list-page">
      <section className="workspace-panel">
        <header className="page-heading">
          <h1>나의 재배지</h1>
          <div className="page-heading__actions">
            <span className="summary-chip">
              전체 <strong>{cultivations.length}</strong>
            </span>
            <div className="notif-bell-wrap">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setNotifOpen((open) => !open)}
                aria-label="알림"
              >
                <Bell aria-hidden="true" /> 알림
              </button>
              {notifOpen && <NotificationBellPanel onClose={() => setNotifOpen(false)} />}
            </div>
            <Link className="button button--primary" to="/cultivations/new">
              <Plus aria-hidden="true" /> 새 재배 시작
            </Link>
          </div>
        </header>
        <div className="section-caption">
          <span>사진 위 상태는 최신 센서값과 설정 범위를 기준으로 계산합니다.</span>
          <span>등록된 센서만 표시</span>
        </div>
        {cultivations.length === 0 ? (
          <EmptyState
            title="아직 재배지가 없습니다."
            description="첫 재배지를 만들고 센서 환경을 관리해 보세요."
            action={
              <Link className="button button--primary" to="/cultivations/new">
                새 재배 시작
              </Link>
            }
          />
        ) : (
          <>
            <div className="cultivation-search" role="search">
              <Search aria-hidden="true" />
              <label className="sr-only" htmlFor="cultivation-search-input">
                재배지 검색
              </label>
              <input
                id="cultivation-search-input"
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(0);
                }}
                placeholder="재배지 이름 또는 버섯 종류 검색"
              />
            </div>
            {filteredCultivations.length === 0 ? (
              <EmptyState
                title="검색 결과가 없습니다."
                description="재배지 이름이나 버섯 종류를 다르게 입력해 보세요."
                action={
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => setSearchTerm("")}
                  >
                    검색어 지우기
                  </button>
                }
              />
            ) : (
              <>
                <div className="cultivation-list">
                  {pagedCultivations.map((cultivation) => (
                    <div className="cultivation-card-shell" key={cultivation.cultivationId}>
                      <CultivationCard
                        cultivation={cultivation}
                        mushroomName={mushrooms.get(cultivation.mushroomId)}
                        latestSensorValues={
                          latestValuesByCultivationId?.[cultivation.cultivationId]?.length
                            ? latestValuesByCultivationId[cultivation.cultivationId]
                            : (initialLatestValuesByCultivationId[cultivation.cultivationId] ?? [])
                        }
                        sensorTrend1h={
                          trendByCultivationId[cultivation.cultivationId] ??
                          listQuery.data?.["sensorTrend1hByCultivationId"]?.[cultivation.cultivationId]
                        }
                      />
                    </div>
                  ))}
                </div>
                <AdminPagination page={visiblePage} totalPages={totalPages} onChange={setPage} />
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
