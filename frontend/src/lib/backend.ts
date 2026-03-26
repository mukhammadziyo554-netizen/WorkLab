function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isPlaceholderBackendUrl(value: string): boolean {
  return /your-backend-domain\.com/i.test(value);
}

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

function isTelegramRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean((window as any).Telegram?.WebApp) || /Telegram/i.test(window.navigator.userAgent);
}

import { getSessionToken } from "./session";

// Prefer explicit public API URL set by the deploy environment. This avoids
// using the frontend origin as the backend target (which caused proxying and
// intermittent "offline" reports when the backend runs on a different host).
export function getBackendBaseUrl(): string {
  const publicApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApi && !isPlaceholderBackendUrl(publicApi)) {
    return stripTrailingSlash(publicApi);
  }

  // Fallback to legacy name if present (backwards-compat)
  const legacy = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (legacy && !isPlaceholderBackendUrl(legacy)) {
    return stripTrailingSlash(legacy);
  }

  // In browser during local development prefer same-origin to use Next.js
  // rewrites proxy. In production we expect NEXT_PUBLIC_API_URL to be set.
  if (typeof window !== "undefined") {
    return stripTrailingSlash(window.location.origin);
  }

  return "";
}

export function getBackendConnectionErrorMessage(): string {
  const backendBaseUrl = getBackendBaseUrl();

  if (!backendBaseUrl) {
    return "Backend connection failed. Could not determine backend URL.";
  }

  if (isTelegramRuntime() && isLocalhostUrl(backendBaseUrl)) {
    return "Backend connection failed. Telegram cannot access localhost. Set NEXT_PUBLIC_API_URL to your public HTTPS backend URL.";
  }

  return "Backend connection failed. Please check server status.";
}

export function getApiHeaders(extraHeaders?: HeadersInit): HeadersInit {
  const token = getSessionToken();
  const base: HeadersInit = {
    ...(extraHeaders || {}),
  };

  if (token) {
    base["Authorization"] = `Bearer ${token}`;
  }

  return base;
}

export async function fetchWithRetry(input: RequestInfo, init?: RequestInit, retries = 1): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (retries > 0) {
      // small backoff before retry
      await new Promise((res) => setTimeout(res, 300));
      return fetchWithRetry(input, init, retries - 1);
    }
    throw err;
  }
}