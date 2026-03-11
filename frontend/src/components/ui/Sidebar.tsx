"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../providers/LanguageProvider";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";

type NavItem = {
  label: string;
  href: string;
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
      { label: "Dashboard", href: "/dashboard" },
      { label: "AI Employees", href: "/dashboard/ai-employees", requiresFeature: "ai_employees" },
      { label: "Knowledge Base", href: "/dashboard/knowledge-base", requiresFeature: "knowledge_base" },
      { label: "Conversations", href: "/dashboard/conversations", requiresFeature: "ai_chat" },
      { label: "Analytics", href: "/dashboard/analytics", requiresFeature: "analytics_dashboard" },
      { label: "Admin", href: "/admin", adminOnly: true },
      { label: "Settings", href: "/dashboard/settings" },
      { label: "Billing", href: "/dashboard/settings/billing" },
      { label: "Pricing", href: "/pricing" },
      { label: "Profile", href: "/dashboard/profile" },
    ],
    []
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
      window.localStorage.removeItem("worklab_session_token");
      router.push("/login");
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="w-full border-b border-white/10 bg-[#05070f] p-5 md:h-screen md:w-64 md:border-b-0 md:border-r md:p-6">
      <div className="mb-8">
        <Link
          href="/"
          aria-label="Go to home page"
          className="group inline-block cursor-pointer rounded-lg transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
        >
          <h1 className="text-xl font-bold tracking-tight text-white transition group-hover:text-cyan-200">
            WorkLab
          </h1>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 transition group-hover:text-slate-300">
            {t.sidebar.subtitle}
          </p>
        </Link>
      </div>

      <nav className="grid gap-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const className = `rounded-lg px-3 py-2 text-sm transition ${
            isActive
              ? "border border-cyan-300/30 bg-gradient-to-r from-cyan-300/20 to-purple-500/20 text-cyan-200"
              : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
          }`;

          return (
            <Link key={item.label} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-200"
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </nav>
    </aside>
  );
}
