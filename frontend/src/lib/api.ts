import { API_URL, APP_ID } from "./config";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getApiConfig(token?: string): RequestInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (APP_ID) {
    headers["x-app-id"] = APP_ID;
  }
  return { headers };
}

export async function apiGet(path: string, token?: string) {
  const res = await fetch(`${API_URL}${path}`, getApiConfig(token));
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status);
  return res.json();
}

export async function apiPost(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    ...getApiConfig(token),
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status);
  return res.json();
}

export async function apiPut(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    ...getApiConfig(token),
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status);
  return res.json();
}

export async function apiDelete(path: string, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    ...getApiConfig(token),
    method: "DELETE",
  });
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status);
  return res.json();
}
