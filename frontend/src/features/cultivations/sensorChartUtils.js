import { formatDateTime, normalizeList } from "../../utils/formatters";

const CHART_BUCKET_MINUTES = [
  { maxRange: 10, bucket: 1 },
  { maxRange: 30, bucket: 5 },
  { maxRange: 60, bucket: 5 },
  { maxRange: 180, bucket: 15 },
  { maxRange: 360, bucket: 15 },
  { maxRange: 720, bucket: 15 },
];

export function chartBucketMinutes(rangeMinutes) {
  return CHART_BUCKET_MINUTES.find(({ maxRange }) => rangeMinutes <= maxRange)?.bucket ?? 15;
}

export function aggregateChartPoints(points, rangeMinutes) {
  const bucketMs = chartBucketMinutes(rangeMinutes) * 60 * 1000;
  const buckets = new Map();

  points.forEach((point) => {
    const timestamp = new Date(point.measuredAt).getTime();
    const value = Number(point.value);
    if (!Number.isFinite(timestamp) || !Number.isFinite(value)) return;

    const bucketStart = Math.floor(timestamp / bucketMs) * bucketMs;
    const bucket = buckets.get(bucketStart) ?? { measuredAt: bucketStart, values: [] };
    bucket.values.push(value);
    buckets.set(bucketStart, bucket);
  });

  return [...buckets.values()]
    .sort((left, right) => left.measuredAt - right.measuredAt)
    .map(({ measuredAt, values }) => ({
      measuredAt: formatDateTime(new Date(measuredAt).toISOString()),
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
}

export function preferNonEmptyLatestValues(latestResponse, fallbackValues) {
  const latestValues = normalizeList(latestResponse);
  return latestValues.length > 0 ? latestValues : normalizeList(fallbackValues);
}
