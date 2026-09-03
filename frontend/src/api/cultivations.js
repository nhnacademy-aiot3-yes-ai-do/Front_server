import { jsonRequest, request, unwrapApiResponse } from "./http";

export const cultivationKeys = {
  all: ["cultivations"],
  list: () => [...cultivationKeys.all, "list"],
  preview: (id) => [...cultivationKeys.all, "preview", Number(id)],
  detail: (id) => [...cultivationKeys.all, "detail", Number(id)],
  dailyFeedback: (id, feedbackDate) => [
    ...cultivationKeys.all,
    "daily-feedback",
    Number(id),
    feedbackDate,
  ],
  latest: (id) => [...cultivationKeys.all, "latest", Number(id)],
  trend: (id, deviceEui, sensorType, unit) => [
    ...cultivationKeys.all,
    "trend",
    Number(id),
    deviceEui,
    sensorType,
    unit,
  ],
};

export function getCultivationListPage() {
  return request("/cultivations/page-data");
}

export function getCultivationPreview(id) {
  return request(`/cultivations/${id}/preview`);
}

export function getCultivationDetailPage(id) {
  return request(`/cultivations/${id}/page-data`);
}

export function getDailyFeedback(id, feedbackDate) {
  return request(`/api/cultivations/${id}/daily-feedbacks/${feedbackDate}`).then(unwrapApiResponse);
}

export function getLatestSensorValues(id) {
  return request(`/cultivations/${id}/sensor-values`);
}

export function getSensorTrend(id, deviceEui, sensorType, unit) {
  const search = new URLSearchParams({
    "device-eui": deviceEui,
    "sensor-type": sensorType,
    unit,
  });
  return request(`/cultivations/${id}/sensor-values/trend?${search}`);
}

export function createCultivation(payload) {
  return jsonRequest("/cultivations", "POST", payload);
}
