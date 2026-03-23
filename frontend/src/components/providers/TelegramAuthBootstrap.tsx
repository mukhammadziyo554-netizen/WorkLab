"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getApiHeaders, getBackendBaseUrl, getBackendConnectionErrorMessage } from "../../lib/backend";
import { setSessionToken, syncSessionCookieFromStorage } from "../../lib/session";

type TelegramAuthPayload = {
  init_data?: string;
  user: {
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
    language_code?: string;
  };
};

type TelegramAuthResponse = {
  ok: boolean;
  token: string;
};

const SESSION_KEY = "worklab_session_token";

function isAuthenticatedArea(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/create-employee") ||
    pathname.startsWith("/telegram-bot") ||
    pathname.startsWith("/login")
  );
}

export default function TelegramAuthBootstrap() {
  const pathname = usePathname();
  const router = useRouter();
  const hasAttemptedAuth = useRef(false);
  const isAuthenticating = useRef(false);
  const hasLoggedDebug = useRef(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isTelegramClient = /Telegram/i.test(window.navigator.userAgent);
    const hasTelegramWebApp = Boolean(window.Telegram?.WebApp);

    if (!isTelegramClient && !hasTelegramWebApp) {
      return;
    }

    const root = document.documentElement;
    root.classList.add("telegram-mini-app");

    return () => {
      root.classList.remove("telegram-mini-app");
    };
  }, []);

  useEffect(() => {
    if (hasAttemptedAuth.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (window.localStorage.getItem(SESSION_KEY)) {
      syncSessionCookieFromStorage();
      return;
    }

    if (!isAuthenticatedArea(pathname)) {
      return;
    }

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return;
    }

    const pollIntervalMs = 1500;
    const maxWaitMs = 8000;
    let isCancelled = false;

    const authenticate = async (payload: TelegramAuthPayload): Promise<boolean> => {
      try {
        const response = await fetch(`${backendBaseUrl}/telegram-auth`, {
          method: "POST",
          headers: getApiHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          // Silent retry in background for transient backend/network failures.
          return false;
        }

        const data = (await response.json()) as TelegramAuthResponse;

        if (!data.ok || !data.token) {
          return false;
        }

        setFallbackMessage(null);
        setSessionToken(data.token);
        hasAttemptedAuth.current = true;

        if (pathname !== "/dashboard") {
          router.push("/dashboard");
        }
        return true;
      } catch {
        if (isAuthenticatedArea(pathname)) {
          setFallbackMessage(getBackendConnectionErrorMessage());
        }
        return false;
      }
    };

    const tryAuthenticate = async () => {
      if (isCancelled || hasAttemptedAuth.current || isAuthenticating.current) {
        return;
      }

      const telegramWebApp = window.Telegram?.WebApp;
      if (!hasLoggedDebug.current) {
        console.log("Telegram WebApp:", telegramWebApp);
        hasLoggedDebug.current = true;
      }

      const telegramUser = telegramWebApp?.initDataUnsafe?.user;
      const telegramInitData = telegramWebApp?.initData;

      if (!telegramUser?.id) {
        return;
      }

      isAuthenticating.current = true;
      await authenticate({
        init_data: telegramInitData,
        user: {
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          photo_url: telegramUser.photo_url,
          language_code: telegramUser.language_code,
        },
      });
      isAuthenticating.current = false;
    };

    const intervalId = window.setInterval(() => {
      void tryAuthenticate();
    }, pollIntervalMs);

    const timeoutId = window.setTimeout(() => {
      const isTelegramClient = /Telegram/i.test(window.navigator.userAgent);
      const telegramWebApp = window.Telegram?.WebApp;
      if (isTelegramClient && !telegramWebApp && isAuthenticatedArea(pathname)) {
        setFallbackMessage(
          "Telegram WebApp script is unavailable. Reopen from the bot and make sure WORKLAB_WEBAPP_URL points to your live HTTPS site."
        );
      }
    }, maxWaitMs);

    void tryAuthenticate();

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname, router]);

  if (!fallbackMessage || !isAuthenticatedArea(pathname)) {
    return null;
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 rounded-lg border border-amber-300/40 bg-amber-100 px-4 py-3 text-sm text-amber-900 shadow-lg">
      {fallbackMessage}
    </div>
  );
}
