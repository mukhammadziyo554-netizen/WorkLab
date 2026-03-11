"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";

type AccountUser = {
  first_name?: string;
  last_name?: string;
  username?: string;
  company_name?: string;
  email?: string;
  photo_url?: string;
  role?: string;
};

type SessionResponse = {
  ok: boolean;
  user?: AccountUser;
};

const SESSION_KEY = "worklab_session_token";

const passthroughImageLoader = ({ src }: { src: string }) => src;

function getInitials(user: AccountUser): string {
  const fromName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  if (fromName) {
    return fromName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  const fallback = user.company_name || user.username || user.email || "User";
  return fallback
    .split(/\s+|@|\./)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function UserAvatarMenu() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (telegramUser?.id) {
      setUser({
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username,
        photo_url: telegramUser.photo_url,
      });
    }

    const token = window.localStorage.getItem(SESSION_KEY);
    const backendBaseUrl = getBackendBaseUrl();
    if (!token || !backendBaseUrl) {
      return;
    }

    const resolveSession = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/auth/session`, {
          headers: getApiHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SessionResponse;
        if (data.ok && data.user) {
          setUser((prev) => ({ ...prev, ...data.user }));
        }
      } catch {
        // Keep local Telegram user fallback if backend session request fails.
      }
    };

    void resolveSession();
  }, []);

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("click", onWindowClick);
    return () => {
      window.removeEventListener("click", onWindowClick);
    };
  }, []);

  const initials = useMemo(() => (user ? getInitials(user) : ""), [user]);

  const onLogout = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const token = window.localStorage.getItem(SESSION_KEY);
    const backendBaseUrl = getBackendBaseUrl();

    setIsLoggingOut(true);
    try {
      if (token && backendBaseUrl) {
        await fetch(`${backendBaseUrl}/auth/logout`, {
          method: "POST",
          headers: getApiHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });
      }
    } catch {
      // Logout should still complete client-side.
    } finally {
      window.localStorage.removeItem(SESSION_KEY);
      setUser(null);
      setIsOpen(false);
      setIsLoggingOut(false);
      router.push("/login");
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#0f1426] text-xs font-semibold text-slate-100 transition hover:border-cyan-300/60"
        aria-label="Open account menu"
      >
        {user.photo_url ? (
          // Telegram photo_url is a trusted HTTPS URL from Telegram user context.
          <Image
            src={user.photo_url}
            alt="Account avatar"
            width={40}
            height={40}
            className="h-full w-full object-cover"
            loader={passthroughImageLoader}
            unoptimized
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {isOpen ? (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-[#0b1020]/95 p-2 shadow-[0_16px_42px_rgba(0,0,0,0.45)] backdrop-blur">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
            onClick={() => setIsOpen(false)}
          >
            Settings
          </Link>
          {user.role === "admin" ? (
            <Link
              href="/admin"
              className="block rounded-lg px-3 py-2 text-sm text-cyan-200 transition hover:bg-white/10"
              onClick={() => setIsOpen(false)}
            >
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-rose-400/15 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
