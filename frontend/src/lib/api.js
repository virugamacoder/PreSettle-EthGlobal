import { settings } from "../config/env.js";

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(method, path, { query, body, token } = {}) {
  const url = new URL(settings.apiBaseUrl + path);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.message || `Request failed (${res.status})`, data);
  return data;
}

export const api = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body, token) => request("POST", path, { body, token }),

  /** Uploads an image file as the raw request body (admin session token required). */
  async upload(path, file, token) {
    const res = await fetch(settings.apiBaseUrl + path, {
      method: "POST",
      headers: { "content-type": file.type, authorization: `Bearer ${token}` },
      body: file,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data?.message || `Upload failed (${res.status})`, data);
    return data;
  },
};
