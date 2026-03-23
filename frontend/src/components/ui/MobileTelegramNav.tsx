"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../providers/LanguageProvider";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";
import { clearSessionToken, getSessionToken } from "../../lib/session";

type MobileNavItem = {
  label: string;
  href: string;
  activeWhen?: (pathname: string) => boolean;
  adminOnly?: boolean;
};

export default function MobileTelegramNav() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const navItems = useMemo<MobileNavItem[]>(
    () => [
      { label: t.mobileNav.admin, href: "/admin", adminOnly: true, activeWhen: (value) => value === "/admin" },
      { label: t.mobileNav.aiEmployees, href: "/dashboard/ai-employees" },
      { label: t.mobileNav.knowledgeBase, href: "/dashboard/knowledge-base" },
      { label: t.mobileNav.conversations, href: "/dashboard/conversations" },
      { label: t.mobileNav.analytics, href: "/dashboard/analytics" },
      { label: "Reports", href: "/dashboard/reports", activeWhen: (value) => value.startsWith("/dashboard/analytics") },
      { label: "Integrations", href: "/dashboard/integrations", activeWhen: (value) => value.startsWith("/dashboard/settings") },
      { label: t.mobileNav.settings, href: "/dashboard/settings" },
      { label: t.mobileNav.billing, href: "/dashboard/settings/billing" },
      { label: t.mobileNav.pricing, href: "/pricing" },
      { label: t.mobileNav.profile, href: "/dashboard/profile" },
    ],
    [t]
  );

  const visibleItems = useMemo(
    () => navItems.filter((item) => (item.adminOnly ? isAdmin : true)),
    [isAdmin, navItems]
  );

  useEffect(() => {
    const token = getSessionToken();
    const backendBaseUrl = getBackendBaseUrl();
    if (!token || !backendBaseUrl) {
      setIsAdmin(false);
      return;
    }

    const loadAdminState = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/features/status`, {
          headers: getApiHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });

        if (!response.ok) {
          setIsAdmin(false);
          return;
        }

        const data = (await response.json()) as {
          role?: string;
          is_admin?: boolean;
        };
        setIsAdmin(Boolean(data.is_admin) || data.role === "admin");
      } catch {
        setIsAdmin(false);
      }
    };

    void loadAdminState();
  }, []);

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
    const token = getSessionToken();
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
      clearSessionToken();
      setIsOpen(false);
      router.push("/login");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header
        className="navbar-premium sticky top-0 z-30 border-b md:hidden"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0.4rem)",
        }}
      >
        <div
          className="mobile-header-shell grid grid-cols-[1fr_auto_1fr] items-center pb-2.5"
          style={{
            paddingLeft: "calc(env(safe-area-inset-left) + 1rem)",
            paddingRight: "calc(env(safe-area-inset-right) + 1rem)",
          }}
        >
          <div className="justify-self-start">
            <button
              type="button"
              aria-label={isOpen ? t.mobileNav.closeMenu : t.mobileNav.openMenu}
              aria-expanded={isOpen}
              onClick={() => setIsOpen((previous) => !previous)}
              className={`mobile-menu-toggle button-pop relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-slate-100 shadow-[0_8px_18px_rgba(2,8,20,0.45)] transition duration-200 active:scale-95 ${
                isOpen
                  ? "border-cyan-200/45 bg-[rgba(8,16,34,0.92)]"
                  : "border-white/15 bg-[rgba(8,16,34,0.88)] hover:border-cyan-300/45 hover:bg-[rgba(11,22,44,0.94)]"
              }`}
            >
              <span
                className={`mobile-menu-line absolute h-[2px] w-5 rounded-full bg-slate-100 transition-all ${
                  isOpen ? "translate-y-0 rotate-45" : "-translate-y-[4px] rotate-0"
                }`}
                style={{ transitionDuration: "240ms" }}
              />
              <span
                className={`mobile-menu-line absolute h-[2px] w-5 rounded-full bg-slate-100 transition-all ${
                  isOpen ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"
                }`}
                style={{ transitionDuration: "240ms" }}
              />
              <span
                className={`mobile-menu-line absolute h-[2px] w-5 rounded-full bg-slate-100 transition-all ${
                  isOpen ? "translate-y-0 -rotate-45" : "translate-y-[4px] rotate-0"
                }`}
                style={{ transitionDuration: "240ms" }}
              />
            </button>
          </div>

          <Link href="/dashboard" className="shrink-0 text-[1.08rem] font-semibold tracking-tight text-white">
            WorkLab
          </Link>

          <div className="justify-self-end">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div
        className={`mobile-menu-overlay fixed inset-0 z-40 bg-[rgba(0,0,0,0.35)] backdrop-blur-[6px] transition-opacity md:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ transitionDuration: "250ms" }}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      >
        <aside
          className={`mobile-menu-drawer h-full w-[50vw] min-w-[205px] max-w-[300px] border-r border-[rgba(255,255,255,0.08)] bg-gradient-to-b from-[rgba(10,15,30,0.95)] to-[rgba(5,10,20,0.95)] p-3.5 shadow-[0_18px_48px_rgba(0,0,0,0.62)] backdrop-blur-xl transition-transform ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            transitionDuration: "250ms",
            paddingTop: "calc(env(safe-area-inset-top) + 0.9rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.85rem)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <nav className="grid gap-1">
            {visibleItems.map((item) => {
              const isActive = item.activeWhen
                ? item.activeWhen(pathname)
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-menu-item button-pop rounded-lg px-3 py-2 text-[0.82rem] font-medium transition ${
                    isActive
                      ? "border border-cyan-300/45 bg-cyan-300/20 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.1)]"
                      : "border border-transparent text-slate-50 hover:border-cyan-300/35 hover:bg-[#12203b]/80 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="mobile-menu-item mt-2 rounded-lg border border-white/20 px-3 py-2 text-left text-[0.82rem] font-medium text-slate-50 transition hover:border-rose-300/45 hover:bg-rose-400/14 hover:text-rose-200"
            >
              {isLoggingOut ? `${t.mobileNav.logout}...` : t.mobileNav.logout}
            </button>
          </nav>
        </aside>
      </div>
    </>
  );
}
