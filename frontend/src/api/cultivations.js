import { jsonRequest, request, unwrapApiResponse } from "./http";

export const cultivationKeys = {
  all: ["cultivations"],
  list: () => [...cultivationKeys.all, "list"],
  preview: (id) => [...cultivationKeys.all, "preview", Number(id)],
  detail: (id) => [...cultivationKeys.all, "detail", Number(id)],
  setup: (id) => [...cultivationKeys.all, "setup", Number(id)],
  latest: (id) => [...cultivationKeys.all, "latest", Number(id)],
  trend: (id, deviceEui, sensorType, unit) => [
    ...cultivationKeys.all,
    "trend",
    Number(id),
    deviceEui,
    sensorType,
    unit,
  ],
  guide: (mushroomId) => [...cultivationKeys.all, "mushroom-guide", Number(mushroomId)],
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

export function getCultivationSetupPage(id) {
  return request(`/cultivations/${id}/setup-data`);
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
export function getMushroomGuide(mushroomId) {
  return request(`/cultivations/mushrooms/${mushroomId}/guide`).then(unwrapApiResponse);
}
