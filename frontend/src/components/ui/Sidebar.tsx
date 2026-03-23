"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../providers/LanguageProvider";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";
import { clearSessionToken } from "../../lib/session";

type NavItem = {
  label: string;
  href: string;
  activeWhen?: (pathname: string) => boolean;
  requiresFeature?: "ai_chat" | "ai_employees" | "telegram_integration" | "analytics_dashboard" | "knowledge_base";
  adminOnly?: boolean;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [featureMap, setFeatureMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = window.localStorage.getItem("worklab_session_token");
    const backendBaseUrl = getBackendBaseUrl();
    if (!token || !backendBaseUrl) {
      return;
    }

    const loadFeatureStatus = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/features/status`, {
          headers: getApiHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          role?: string;
          is_admin?: boolean;
          features?: Record<string, boolean>;
        };
        setIsAdmin(Boolean(data.is_admin) || data.role === "admin");
        setFeatureMap(data.features || {});
      } catch {
        setIsAdmin(false);
      }
    };

    void loadFeatureStatus();
  }, []);

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: t.sidebar.admin, href: "/admin", adminOnly: true, activeWhen: (value) => value === "/admin" },
      { label: t.sidebar.aiEmployees, href: "/dashboard/ai-employees", requiresFeature: "ai_employees" },
      { label: t.sidebar.knowledgeBase, href: "/dashboard/knowledge-base", requiresFeature: "knowledge_base" },
      { label: t.sidebar.conversations, href: "/dashboard/conversations", requiresFeature: "ai_chat" },
      { label: t.sidebar.analytics, href: "/dashboard/analytics", requiresFeature: "analytics_dashboard" },
      { label: "Reports", href: "/dashboard/reports", activeWhen: (value) => value.startsWith("/dashboard/analytics") },
      { label: "Integrations", href: "/dashboard/integrations", activeWhen: (value) => value.startsWith("/dashboard/settings") },
      { label: t.sidebar.settings, href: "/dashboard/settings" },
      { label: t.sidebar.billing, href: "/dashboard/settings/billing" },
      { label: t.sidebar.pricing, href: "/pricing" },
      { label: t.sidebar.profile, href: "/dashboard/profile" },
    ],
    [t]
  );

  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    if (!item.requiresFeature) {
      return true;
    }
    return featureMap[item.requiresFeature] !== false;
  });

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
      // Logout should still continue client-side if API call fails.
    } finally {
      clearSessionToken();
      router.push("/login");
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="w-full border-b border-white/10 bg-[#05070f] p-4 md:h-screen md:w-60 md:border-b-0 md:border-r md:p-5">
      <div className="mb-6">
        <Link
          href="/"
          aria-label="Go to home page"
          className="group inline-block cursor-pointer rounded-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
        >
          <h1 className="text-lg font-bold tracking-tight text-white transition group-hover:text-cyan-200">
            WorkLab
          </h1>
          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-400 transition group-hover:text-slate-200">
            {t.sidebar.subtitle}
          </p>
        </Link>
      </div>

      <nav className="grid gap-1.5">
        {visibleItems.map((item) => {
          const isActive = item.activeWhen
            ? item.activeWhen(pathname)
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const className = `rounded-lg px-3 py-1.5 text-[0.82rem] font-medium transition ${
            isActive
              ? "border border-cyan-300/35 bg-gradient-to-r from-cyan-300/20 to-purple-500/20 text-cyan-100"
              : "border border-transparent text-slate-200 hover:border-white/10 hover:bg-white/5 hover:text-white"
          }`;

          return (
            <Link key={item.label} href={item.href} className={`button-pop ${className}`}>
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="button-pop mt-2.5 rounded-lg border border-white/15 px-3 py-1.5 text-left text-[0.82rem] font-medium text-slate-200 transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-200"
        >
          {isLoggingOut ? t.common.loggingOut : t.common.logout}
        </button>
      </nav>
    </aside>
  );
}
