import { getApiHeaders, getBackendBaseUrl } from "./backend";

const SESSION_KEY = "worklab_session_token";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function getSessionToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(SESSION_KEY) || "";
}

export function getOperationsBaseUrl(): string {
  return getBackendBaseUrl();
}

export async function operationsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getOperationsBaseUrl();
  const token = getSessionToken();

  if (!baseUrl || !token) {
    throw new Error("Missing backend URL or session token");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: getApiHeaders({
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    }),
  });

  if (!response.ok) {
    let detail: unknown = null;
    try {
      detail = await response.json();
    } catch {
      detail = null;
    }

    const message =
      typeof detail === "object" && detail !== null && "detail" in detail
        ? String((detail as { detail?: unknown }).detail)
        : `Request failed: ${response.status}`;

    throw new ApiError(message, response.status, detail);
  }

  return (await response.json()) as T;
}
