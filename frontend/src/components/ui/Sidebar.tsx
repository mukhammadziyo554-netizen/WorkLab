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

type SidebarProps = {
  onCollapseChange?: (collapsed: boolean) => void;
};

export default function Sidebar({ onCollapseChange }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [featureMap, setFeatureMap] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const sidebarWidth = isCollapsed ? 72 : 240;

  return (
    <>
      {/* Fixed sidebar for md+ */}
      <aside
        className="fixed top-0 left-0 z-[1000] h-screen hidden md:flex flex-col transition-all duration-300"
        style={{ width: sidebarWidth, background: "linear-gradient(180deg, #0B0F1A, #0A0D16)", boxShadow: "inset 0 0 40px rgba(0,0,0,0.3)" }}
        aria-hidden={false}
      >
        <div className="relative h-full overflow-y-auto px-4 py-5">
          <button
            type="button"
            onClick={() => {
              const newCollapsed = !isCollapsed;
              setIsCollapsed(newCollapsed);
              onCollapseChange?.(newCollapsed);
            }}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-md text-slate-200 transition-transform duration-200 hover:scale-105"
            style={{ backdropFilter: "blur(10px)" }}
          >
            <span className="text-sm">{isCollapsed ? "→" : "←"}</span>
          </button>

          <div className="mb-6 mt-2 flex items-center gap-3 transition-opacity duration-250">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-300 to-blue-500 flex-shrink-0" />
              <div className={`overflow-hidden transition-all duration-250 ${isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[300px]'}`}>
                <Link href="/" className="group block">
                  <h1 className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-200">WorkLab</h1>
                  <p className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-400 group-hover:text-slate-200">{t.sidebar.subtitle}</p>
                </Link>
              </div>
            </div>
          </div>

          <nav className="grid gap-2">
            {visibleItems.map((item) => {
              const isActive = item.activeWhen
                ? item.activeWhen(pathname)
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200 ${
                    isActive
                      ? 'border border-transparent bg-gradient-to-r from-cyan-300/18 to-purple-500/12 text-cyan-100 shadow-[0_0_10px_rgba(0,255,200,0.08)]'
                      : 'text-slate-200 hover:bg-[rgba(255,255,255,0.03)] hover:text-white'
                  }`}
                  style={{ alignItems: 'center' }}
                >
                  <span className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${isActive ? 'bg-cyan-300/20' : 'bg-white/5'}`}>
                    <svg className="h-3 w-3 text-cyan-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="4" /></svg>
                  </span>

                  <span className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 max-w-0 overflow-hidden' : 'opacity-100'}`}>{item.label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-left text-[0.9rem] font-medium text-slate-200 transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-200"
            >
              {isLoggingOut ? t.common.loggingOut : t.common.logout}
            </button>
          </nav>
        </div>
      </aside>

      {/* Mobile: overlay drawer */}
      <MobileDrawer />

      {/* Spacer to keep flow/layout alignment for pages that render Sidebar in-flow */}
      <div className="hidden md:block" style={{ width: sidebarWidth }} aria-hidden="true" />
    </>
  );
}

    function MobileDrawer() {
      const [open, setOpen] = useState(false);
      const { t } = useLanguage();

      useEffect(() => {
        if (open) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "";
        }
        return () => {
          document.body.style.overflow = "";
        };
      }, [open]);

      const navItems = [
        { label: t.mobileNav?.aiEmployees ?? "AI Employees", href: "/dashboard/ai-employees" },
        { label: t.mobileNav?.knowledgeBase ?? "Knowledge Base", href: "/dashboard/knowledge-base" },
        { label: t.mobileNav?.conversations ?? "Conversations", href: "/dashboard/conversations" },
        { label: t.mobileNav?.analytics ?? "Analytics", href: "/dashboard/analytics" },
        { label: t.mobileNav?.settings ?? "Settings", href: "/dashboard/settings" },
      ];

      return (
        <>
          <div className="md:hidden">
            <div className="p-3">
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:border-cyan-300/45"
              >
                <span>{open ? '✕' : '☰'}</span>
              </button>
            </div>
          </div>

          <div
            className={`fixed inset-0 z-50 md:hidden transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-hidden={!open}
          >
            <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />

            <aside
              className={`absolute left-0 top-0 h-full w-[78vw] max-w-[320px] bg-[linear-gradient(180deg,#0B0F1A,#0A0D16)] shadow-lg p-4 transition-transform duration-260 ${open ? 'translate-x-0' : '-translate-x-full'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">WorkLab</h3>
                  <p className="text-xs text-slate-400">{t.sidebar.subtitle}</p>
                </div>
                <button onClick={() => setOpen(false)} className="h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.03)] flex">
                  ✕
                </button>
              </div>

              <nav className="flex flex-col gap-2">
                {navItems.map((item, idx) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-2 text-white/90 transition transform ${idx < 4 ? 'stagger-1' : ''}`}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        </>
      );
    }
