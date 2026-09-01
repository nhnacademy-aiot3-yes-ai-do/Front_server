const backendBase = import.meta.env.DEV ? "/backend" : "";

export function backendUrl(path) {
  return `${backendBase}${path}`;
}

export async function request(path, options = {}) {
  const response = await fetch(backendUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401 || (response.redirected && response.url.includes("/login"))) {
    window.location.assign("/login");
    throw new Error("로그인이 필요합니다.");
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

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
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
