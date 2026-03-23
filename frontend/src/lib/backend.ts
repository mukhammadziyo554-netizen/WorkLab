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

  return Boolean(window.Telegram?.WebApp) || /Telegram/i.test(window.navigator.userAgent);
}

export function getBackendBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (typeof window !== "undefined") {
    // In the browser, always prefer same-origin so Next.js rewrites proxy API calls
    // to backend target configured in next.config.js. This avoids CORS issues and
    // false "backend offline" status when frontend and backend run on different ports.
    return stripTrailingSlash(window.location.origin);
  }

  if (configured && !isPlaceholderBackendUrl(configured)) {
    return stripTrailingSlash(configured);
  }

  return "";
}

export function getBackendConnectionErrorMessage(): string {
  const backendBaseUrl = getBackendBaseUrl();

  if (!backendBaseUrl) {
    return "Backend connection failed. Could not determine backend URL.";
  }

  if (isTelegramRuntime() && isLocalhostUrl(backendBaseUrl)) {
    return "Backend connection failed. Telegram cannot access localhost. Set NEXT_PUBLIC_BACKEND_URL to your public HTTPS backend URL.";
  }

  return "Backend connection failed. Please check server status.";
}

export function getApiHeaders(extraHeaders?: HeadersInit): HeadersInit {
  return {
    ...(extraHeaders || {}),
  };
}