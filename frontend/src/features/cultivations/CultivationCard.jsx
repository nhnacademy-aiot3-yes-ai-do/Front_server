import {useQuery} from "@tanstack/react-query";
import {ChevronRight, ImageOff} from "lucide-react";
import {Link} from "react-router-dom";
import {cultivationKeys, getCultivationPreview} from "../../api/cultivations";
import {formatMode, formatRelativeTime, formatRole, normalizeList, normalizeSensorUnit,} from "../../utils/formatters";
import SensorSparkline from "./SensorSparkline";

function sensorPreviews(preview, suppliedLatestValues) {
  const latestValues = suppliedLatestValues?.length
    ? suppliedLatestValues
    : normalizeList(preview?.latestSensorValues?.latestSensorValueResponses);
  const settings = normalizeList(preview?.sensors?.environmentSettings);
  const sensors = normalizeList(preview?.sensors?.sensors);

  if (!sensors.length) {
    return latestValues.map((latest) => ({
      latest,
      sensor: latest,
      sensorType: { type: latest.sensorType, valueUnit: latest.unit },
      setting: undefined,
    }));
  }

  return sensors.flatMap((sensor) =>
    normalizeList(sensor.sensorTypes).map((sensorType) => ({
      latest: latestValues.find(
        (value) =>
          value.deviceEui === sensor.deviceEui &&
          value.sensorType === sensorType.type &&
          normalizeSensorUnit(value.unit || sensorType.valueUnit) ===
            normalizeSensorUnit(sensorType.valueUnit),
      ),
      sensor,
      sensorType,
      setting: settings.find((setting) => setting.sensorTypeId === sensorType.sensorTypeId),
    })),
  );
}

function cardStatus(entries) {
  if (!entries.length || entries.every((entry) => entry.latest?.value == null)) {
    return { label: "데이터 수집 중", tone: "waiting" };
  }
  const warning = entries.some(({ latest, setting }) => {
    const value = Number(latest?.value);
    if (!Number.isFinite(value)) return false;
    return (
      (setting?.thresholdMin != null && value < Number(setting.thresholdMin)) ||
      (setting?.thresholdMax != null && value > Number(setting.thresholdMax))
    );
  });
  return warning ? { label: "환경 확인 필요", tone: "warning" } : { label: "안정", tone: "stable" };
}

export default function CultivationCard({
  cultivation,
  mushroomName,
  latestSensorValues,
  sensorTrend1h,
}) {
  const previewQuery = useQuery({
    queryKey: cultivationKeys.preview(cultivation.cultivationId),
    queryFn: () => getCultivationPreview(cultivation.cultivationId),
    staleTime: 30_000,
  });
  const preview = previewQuery.data;
  const entries = sensorPreviews(preview, latestSensorValues);
  const status = cardStatus(entries);
  const mostRecentMeasurement = entries
    .map((entry) => entry.latest?.measuredAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <article className={`cultivation-card cultivation-card--${status.tone}`}>
      <div className="cultivation-card__identity">
        <Link className="cultivation-photo" to={`/cultivations/${cultivation.cultivationId}`}>
          {previewQuery.isError ? (
            <span className="cultivation-photo__empty">
              <ImageOff aria-hidden="true" />
              사진 정보를 불러오지 못했습니다
            </span>
          ) : preview?.newestPhoto?.uri ? (
            <img src={preview.newestPhoto.uri} alt={`${cultivation.name} 최근 재배 사진`} />
          ) : (
            <span className="cultivation-photo__empty">
              <ImageOff aria-hidden="true" />
              등록된 재배 사진이 없습니다
            </span>
          )}
          <span className={`status-badge status-badge--${status.tone}`}>{status.label}</span>
          <span className="cultivation-photo__updated">
            {formatRelativeTime(mostRecentMeasurement)}
          </span>
        </Link>
        <div className="cultivation-card__copy">
          <div className="cultivation-card__title-row">
            <div>
              <h2>{cultivation.name}</h2>
              <p>{mushroomName || "버섯 종류 정보 없음"}</p>
            </div>
            <Link
              aria-label={`${cultivation.name} 상세 보기`}
              to={`/cultivations/${cultivation.cultivationId}`}
            >
              <ChevronRight aria-hidden="true" />
            </Link>
          </div>
          <dl className="cultivation-card__facts">
            <div>
              <dt>재배일</dt>
              <dd>{preview?.growthDays ? `D+${preview.growthDays}` : "-"}</dd>
            </div>
            <div>
              <dt>현재 모드</dt>
              <dd>{formatMode(preview?.cultivation?.mode || cultivation.mode)}</dd>
            </div>
            <div>
              <dt>내 역할</dt>
              <dd>{formatRole(preview?.cultivation?.myRole)}</dd>
            </div>
            <div>
              <dt>함께 관리</dt>
              <dd>{cultivation.memberCount ?? 0}명</dd>
            </div>
          </dl>
          <div className="pending-progress">
            <span>성장 단계 및 재배 진행률</span>
            <strong>데이터 준비 중</strong>
          </div>
        </div>
      </div>
      <section className="cultivation-card__sensors" aria-label={`${cultivation.name} 센서 추이`}>
        <header>
          <strong>등록 센서 추이</strong>
          <span>최근 1시간</span>
        </header>
        {previewQuery.isLoading && <p className="sensor-column-state">센서 정보를 불러오는 중</p>}
        {previewQuery.isError && (
          <div className="sensor-column-state">
            <span>센서 정보를 불러오지 못했습니다.</span>
            <button className="text-button" type="button" onClick={() => previewQuery.refetch()}>
              다시 시도
            </button>
          </div>
        )}
        {!previewQuery.isLoading && !previewQuery.isError && entries.length === 0 && (
          <p className="sensor-column-state">등록된 센서가 없습니다.</p>
        )}
        {entries.map((entry) => (
          <SensorSparkline
            key={`${entry.sensor.deviceEui}-${entry.sensorType.type}-${normalizeSensorUnit(entry.sensorType.valueUnit)}`}
            cultivationId={cultivation.cultivationId}
            trend={normalizeList(sensorTrend1h).filter(
              (point) =>
                point.deviceEui === entry.sensor.deviceEui &&
                point.sensorType === entry.sensorType.type &&
                normalizeSensorUnit(point.unit || entry.sensorType.valueUnit) ===
                  normalizeSensorUnit(entry.sensorType.valueUnit),
            )}
            {...entry}
          />
        ))}
      </section>
    </article>
  );
}
