const SESSION_KEY = "worklab_session_token";

export function getSessionToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(SESSION_KEY) || "";
}

export function setSessionToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, token);
  document.cookie = `${SESSION_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  document.cookie = `${SESSION_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function syncSessionCookieFromStorage(): void {
  const token = getSessionToken();
  if (!token || typeof document === "undefined") {
    return;
  }

  if (document.cookie.includes(`${SESSION_KEY}=`)) {
    return;
  }

  document.cookie = `${SESSION_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}
