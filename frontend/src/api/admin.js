import {backendUrl, unwrapApiResponse} from "./http";

async function adminRequest(path, options = {}) {
  const response = await fetch(backendUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (
    response.status === 401 ||
    (response.redirected && new URL(response.url).pathname === "/admin/login")
  ) {
    window.location.assign("/admin/login");
    throw new Error("관리자 로그인이 필요합니다.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message ||
        body?.detail ||
        body?.error ||
        `요청을 처리하지 못했습니다. (${response.status})`,
    );
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

function adminJson(path, method, body) {
  return adminRequest(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getAdminMembers({ status = "active", page = 0, size = 8 } = {}) {
  const params = new URLSearchParams({ status, page, size });
  return adminRequest(`/admin/members/list?${params}`).then(unwrapApiResponse);
}

export function releaseDormantAdminMember(memberId) {
  return adminRequest(`/admin/members/${memberId}/dormant-release`, { method: "PUT" });
}

export function forceWithdrawAdminMember(memberId) {
  return adminRequest(`/admin/members/${memberId}`, { method: "DELETE" });
}

export function getAdminInquiries({ status, page = 0, size = 8 } = {}) {
  const params = new URLSearchParams({ page, size });
  if (status) params.set("status", status);
  return adminRequest(`/admin/inquiries/list?${params}`).then(unwrapApiResponse);
}

export function getAdminInquiry(id) {
  return adminRequest(`/admin/inquiries/${id}`).then(unwrapApiResponse);
}

export function answerAdminInquiry(answerId, content, files) {
  const body = new FormData();
  body.append("request", new Blob([JSON.stringify({ content })], { type: "application/json" }));
  files.forEach((file) => body.append("files", file));
  return adminRequest(`/admin/inquiries/messages/${answerId}`, {
    method: "PUT",
    body,
  }).then(unwrapApiResponse);
}

export function deleteAdminInquiryCultivation(cultivationId) {
  return adminRequest(`/cultivations/${cultivationId}`, { method: "DELETE" });
}

export function getAdminSensorTypes() {
  return adminRequest("/admin/sensor-types").then((data) => data?.sensorTypeInfoResponses || []);
}

export function saveAdminSensorType(sensorType) {
  const body = new URLSearchParams({
    type: sensorType.type,
    valueUnit: sensorType.valueUnit,
  });
  return adminRequest(
    sensorType.id ? `/admin/sensor-types/${sensorType.id}` : "/admin/sensor-types",
    {
      method: sensorType.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
}

export function deleteAdminSensorType(id) {
  return adminRequest(`/admin/sensor-types/${id}`, { method: "DELETE" });
}

export function getAdminMushrooms() {
  return adminRequest("/admin/mushroom-references").then(
    (data) => data?.mushroomReferenceInfoResponses || [],
  );
}

export function saveAdminMushroom(mushroom) {
  return adminJson(
    mushroom.id ? `/admin/mushroom-references/${mushroom.id}` : "/admin/mushroom-references",
    mushroom.id ? "PUT" : "POST",
    mushroom.payload,
  );
}

export function deleteAdminMushroom(id) {
  return adminRequest(`/admin/mushroom-references/${id}`, { method: "DELETE" });
}

const notificationBase = "/admin/notification-events/api";

export function getNotificationEvents() {
  return adminRequest(notificationBase).then((data) => data?.notificationEventTypeResponses || []);
}

export function saveNotificationEvent(event) {
  return adminJson(
    event.id ? `${notificationBase}/${event.id}` : notificationBase,
    event.id ? "PUT" : "POST",
    event,
  );
}

export function deleteNotificationEvent(id) {
  return adminRequest(`${notificationBase}/${id}`, { method: "DELETE" });
}

export function getNotificationTemplates() {
  return adminRequest(`${notificationBase}/templates`).then(
    (data) => data?.notificationTemplateResponses || [],
  );
}

export function saveNotificationTemplate(template) {
  return adminJson(
    template.id ? `${notificationBase}/templates/${template.id}` : `${notificationBase}/templates`,
    template.id ? "PUT" : "POST",
    template,
  );
}

export function deleteNotificationTemplate(id) {
  return adminRequest(`${notificationBase}/templates/${id}`, { method: "DELETE" });
}

export function getNotificationChannels() {
  return adminRequest(`${notificationBase}/channels`).then(
    (data) => data?.channelTypeResponses || [],
  );
}

export function saveNotificationChannel(channel) {
  return adminJson(
    channel.id ? `${notificationBase}/channels/${channel.id}` : `${notificationBase}/channels`,
    channel.id ? "PUT" : "POST",
    channel,
  );
}

export function deleteNotificationChannel(id) {
  return adminRequest(`${notificationBase}/channels/${id}`, { method: "DELETE" });
}

export function restoreNotificationChannel(id) {
  return adminRequest(`${notificationBase}/channels/${id}/restore`, { method: "POST" });
}
