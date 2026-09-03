export function formatDate(value, fallback = "-") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value, fallback = "-") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value) {
  if (!value) return "갱신 정보 없음";
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return formatDateTime(value);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "방금 전 갱신";
  if (minutes < 60) return `${minutes}분 전 갱신`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전 갱신`;
  return formatDate(value);
}

export function formatSensorType(type) {
  const labels = {
    TEMPERATURE: "온도",
    HUMIDITY: "습도",
    CO2: "CO₂",
    LIGHT: "조도",
  };
  return labels[type] || type || "센서";
}

export function formatMode(mode) {
  return mode === "HARVEST" ? "수확 모드" : "재배 모드";
}

export function formatRole(role) {
  return { OWNER: "소유자", MANAGER: "관리자", MEMBER: "멤버" }[role] || role || "멤버";
}

export function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeSensorUnit(unit) {
  if (unit == null) return unit;
  const normalized = String(unit).trim();
  if (!normalized) return normalized;
  return normalized === "℃" ? "°C" : normalized;
}

export function formatProductGrade(grade) {
    const labels = { TOP: "최상", HIGH: "상", MID: "중", LOW: "하" };
    return labels[grade] || null;
}
