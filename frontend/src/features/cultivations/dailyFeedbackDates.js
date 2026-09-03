const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const KOREA_TIME_ZONE = "Asia/Seoul";

export function isDailyFeedbackDate(value) {
  if (!ISO_DATE_PATTERN.test(value || "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getPreviousDateInKorea(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce((values, part) => ({ ...values, [part.type]: part.value }), {});
  const koreaDate = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
  koreaDate.setUTCDate(koreaDate.getUTCDate() - 1);
  return koreaDate.toISOString().slice(0, 10);
}
