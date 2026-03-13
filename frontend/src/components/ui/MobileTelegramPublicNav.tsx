"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../providers/LanguageProvider";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";

type MobileNavItem = {
  label: string;
  href: string;
};

type MobileTelegramPublicNavProps = {
  isAuthenticated: boolean;
  isAdmin: boolean;
};

export default function MobileTelegramPublicNav({
  isAuthenticated,
  isAdmin,
}: MobileTelegramPublicNavProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const primaryItems = useMemo<MobileNavItem[]>(
    () => [
      { label: t.mobileNav.dashboard, href: "/dashboard" },
      { label: t.mobileNav.aiEmployees, href: "/dashboard/ai-employees" },
      { label: t.mobileNav.knowledgeBase, href: "/dashboard/knowledge-base" },
      { label: t.mobileNav.conversations, href: "/dashboard/conversations" },
      { label: t.mobileNav.analytics, href: "/dashboard/analytics" },
      { label: t.mobileNav.settings, href: "/dashboard/settings" },
      { label: t.mobileNav.billing, href: "/dashboard/settings/billing" },
      { label: t.mobileNav.pricing, href: "/pricing" },
      { label: t.mobileNav.profile, href: "/dashboard/profile" },
    ],
    [t]
  );

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  const onLogout = async () => {
    const token = window.localStorage.getItem("worklab_session_token");
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
      // Continue with client-side logout even if API call fails.
    } finally {
      window.localStorage.removeItem("worklab_session_token");
      setIsOpen(false);
      router.push("/login");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div
        className="flex w-full items-center justify-between gap-3"
        style={{
          paddingLeft: "calc(env(safe-area-inset-left) + 0.125rem)",
          paddingRight: "calc(env(safe-area-inset-right) + 0.05rem)",
        }}
      >
        <button
          type="button"
          aria-label={isOpen ? t.mobileNav.closeMenu : t.mobileNav.openMenu}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((previous) => !previous)}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 transition hover:border-cyan-300/45"
        >
          <span
            className={`absolute h-[2px] w-5 rounded-full bg-current transition-all ${
              isOpen ? "translate-y-0 rotate-45" : "-translate-y-[4px] rotate-0"
            }`}
            style={{ transitionDuration: "250ms" }}
          />
          <span
            className={`absolute h-[2px] w-5 rounded-full bg-current transition-all ${
              isOpen ? "translate-y-0 -rotate-45" : "translate-y-[4px] rotate-0"
            }`}
            style={{ transitionDuration: "250ms" }}
          />
        </button>

        <Link href="/" className="text-2xl font-bold tracking-tight text-white">
          WorkLab
        </Link>

        <LanguageSwitcher className="translate-x-1" />
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-[1px] transition-opacity md:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ transitionDuration: "250ms" }}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      >
        <aside
          className={`h-full w-[52vw] min-w-[220px] max-w-[320px] border-r border-cyan-300/20 bg-[#050914]/95 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.62)] backdrop-blur-xl transition-transform ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            transitionDuration: "250ms",
            paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <nav className="grid gap-1.5">
            <Link
              href="/#features"
              className="rounded-lg border border-transparent px-3 py-2.5 text-sm text-slate-100 transition hover:border-cyan-300/30 hover:bg-white/12 hover:text-white"
            >
              {t.nav.features}
            </Link>
            <Link
              href="/ai"
              className="rounded-lg border border-transparent px-3 py-2.5 text-sm text-slate-100 transition hover:border-cyan-300/30 hover:bg-white/12 hover:text-white"
            >
              {t.mobileNav.ai}
            </Link>
            <Link
              href="/create-employee"
              className="rounded-lg border border-transparent px-3 py-2.5 text-sm text-slate-100 transition hover:border-cyan-300/30 hover:bg-white/12 hover:text-white"
            >
              {t.nav.createAiEmployee}
            </Link>

            {primaryItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "border border-cyan-300/45 bg-cyan-300/20 text-cyan-100"
                      : "border border-transparent text-slate-100 hover:border-cyan-300/30 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-lg border border-transparent px-3 py-2.5 text-sm text-cyan-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/20"
              >
                {t.mobileNav.admin}
              </Link>
            ) : null}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={onLogout}
                disabled={isLoggingOut}
                className="mt-2 rounded-lg border border-white/15 px-3 py-2.5 text-left text-sm text-slate-100 transition hover:border-rose-300/45 hover:bg-rose-400/14 hover:text-rose-200"
              >
                {isLoggingOut ? `${t.mobileNav.logout}...` : t.mobileNav.logout}
              </button>
            ) : (
              <Link
                href="/login"
                className="mt-2 rounded-lg border border-white/15 px-3 py-2.5 text-sm text-slate-100 transition hover:border-cyan-300/30 hover:bg-white/12 hover:text-white"
              >
                {t.nav.login}
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </>
  );
}
