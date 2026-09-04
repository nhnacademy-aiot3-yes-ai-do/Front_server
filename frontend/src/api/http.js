const backendBase = import.meta.env.DEV ? "/backend" : "";

export function backendUrl(path) {
  return `${backendBase}${path}`;
}

export function gatewayUrl(path) {
  const gatewayOrigin = import.meta.env.DEV ? "http://localhost:8080" : "https://api.yes-nhn.site";
  return `${gatewayOrigin}${path}`;
}

export async function request(path, options = {}) {
  const { directGateway = false, ...fetchOptions } = options;
  const response = await fetch(directGateway ? gatewayUrl(path) : backendUrl(path), {
    credentials: "include",
    ...fetchOptions,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401 || (response.redirected && response.url.includes("/login"))) {
    window.location.assign("/login");
    const error = new Error("로그인이 필요합니다.");
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(
      body?.message ||
        body?.detail ||
        body?.error ||
        `요청을 처리하지 못했습니다. (${response.status})`,
    );
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

export function gatewayRequest(path, options = {}) {
  return request(path, { ...options, directGateway: true });
}

export function jsonRequest(path, method, body) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function unwrapApiResponse(response) {
  if (response?.success === false) {
    throw new Error(response.message || "요청을 처리하지 못했습니다.");
  }
  return response && Object.hasOwn(response, "data") ? response.data : response;
}
