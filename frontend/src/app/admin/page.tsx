"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";
import { useLanguage } from "../../components/providers/LanguageProvider";

type FeatureItem = {
  feature_key: string;
  display_name: string;
  enabled: boolean;
  updated_at: string;
};

type ActivityItem = {
  id: number;
  event_type: string;
  message: string;
  actor_email: string | null;
  created_at: string;
};

type AdminMonitorResponse = {
  ok: boolean;
  platform_overview: {
    total_users: number;
    active_users_today: number;
    ai_employees_created: number;
    total_conversations_handled: number;
    active_bots: number;
  };
  user_analytics: {
    registrations_over_time: Array<{ day: string; count: number }>;
    daily_active_users: Array<{ day: string; count: number }>;
    ai_interactions_per_day: Array<{ day: string; count: number }>;
  };
  subscription_analytics: {
    cards: {
      free_users: number;
      subscribed_users: number;
      active_subscriptions: number;
      expired_subscriptions: number;
      monthly_revenue_usd: number;
    };
    growth_over_time: Array<{ day: string; count: number }>;
  };
  feature_management: FeatureItem[];
  system_activity: ActivityItem[];
};

type SidebarItem = {
  key: string;
  label: string;
  href: string;
  icon: (active: boolean) => ReactNode;
};

type MetricCardItem = {
  label: string;
  value: string;
  trendText: string;
  trendPositive: boolean;
};

type ConversationRow = {
  id: number;
  customer: string;
  conversationId: string;
  confidence: number;
  status: "Resolved by AI" | "Human takeover" | "Needs training";
};

type AiEmployeeRow = {
  name: string;
  handled: number;
  accuracy: number;
};

const SESSION_KEY = "worklab_session_token";
const SIDEBAR_WIDTH_PX = 240;

export default function AdminPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [data, setData] = useState<AdminMonitorResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadAdminData = useCallback(async () => {
    const token = window.localStorage.getItem(SESSION_KEY);
    const backendBaseUrl = getBackendBaseUrl();
    if (!token || !backendBaseUrl) {
      setErrorText(t.adminPage.sessionMissing);
      setIsAdmin(false);
      router.replace("/login");
      return;
    }

    try {
      const sessionResponse = await fetch(`${backendBaseUrl}/auth/session`, {
        headers: getApiHeaders({
          Authorization: `Bearer ${token}`,
        }),
      });

      if (!sessionResponse.ok) {
        setIsAdmin(false);
        setErrorText(t.adminPage.sessionExpired);
        router.replace("/login");
        return;
      }

      const sessionData = (await sessionResponse.json()) as {
        user?: { role?: string };
      };

      const role = sessionData.user?.role || "user";
      if (role !== "admin") {
        setIsAdmin(false);
        setErrorText(t.adminPage.adminRequired);
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);

      const monitorResponse = await fetch(`${backendBaseUrl}/admin/monitor`, {
        headers: getApiHeaders({
          Authorization: `Bearer ${token}`,
        }),
      });
      if (!monitorResponse.ok) {
        setErrorText(t.adminPage.loadFailed);
        return;
      }

      const monitorData = (await monitorResponse.json()) as AdminMonitorResponse;
      setData(monitorData);
      setErrorText(null);
    } catch {
      setErrorText(t.adminPage.backendUnavailable);
    }
  }, [router, t]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) {
        return;
      }
      setIsPolling(true);
      await loadAdminData();
      setIsPolling(false);
    };

    void run();
    const intervalId = window.setInterval(() => {
      void run();
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [loadAdminData]);

  const toggleFeature = async (featureKey: string, nextValue: boolean) => {
    const token = window.localStorage.getItem(SESSION_KEY);
    const backendBaseUrl = getBackendBaseUrl();
    if (!token || !backendBaseUrl) {
      return;
    }

    try {
      const response = await fetch(`${backendBaseUrl}/admin/features/${featureKey}`, {
        method: "PATCH",
        headers: getApiHeaders({
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }),
        body: JSON.stringify({ enabled: nextValue }),
      });
      if (!response.ok) {
        setErrorText(t.adminPage.toggleFailed);
        return;
      }
      await loadAdminData();
    } catch {
      setErrorText(t.adminPage.toggleFailed);
    }
  };

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      {
        key: "admin-dashboard",
        label: t.common.admin,
        href: "/admin",
        icon: (active) => <GridIcon active={active} />,
      },
      {
        key: "ai-employees",
        label: t.mobileNav.aiEmployees,
        href: "/dashboard/ai-employees",
        icon: (active) => <BotIcon active={active} />,
      },
      {
        key: "knowledge-base",
        label: t.mobileNav.knowledgeBase,
        href: "/dashboard/knowledge-base",
        icon: (active) => <BookIcon active={active} />,
      },
      {
        key: "conversations",
        label: t.mobileNav.conversations,
        href: "/dashboard/conversations",
        icon: (active) => <ChatIcon active={active} />,
      },
      {
        key: "analytics",
        label: t.mobileNav.analytics,
        href: "/dashboard/analytics",
        icon: (active) => <ChartIcon active={active} />,
      },
      {
        key: "reports",
        label: "Reports",
        href: "/dashboard/analytics",
        icon: (active) => <DocIcon active={active} />,
      },
      {
        key: "integrations",
        label: "Integrations",
        href: "/dashboard/settings",
        icon: (active) => <PlugIcon active={active} />,
      },
      {
        key: "settings",
        label: t.mobileNav.settings,
        href: "/dashboard/settings",
        icon: (active) => <SettingsIcon active={active} />,
      },
      {
        key: "billing",
        label: t.mobileNav.billing,
        href: "/dashboard/settings/billing",
        icon: (active) => <CardIcon active={active} />,
      },
    ],
    [t]
  );

  const aiSeries = useMemo(() => data?.user_analytics.ai_interactions_per_day ?? [], [data]);
  const takeoverCount = useMemo(
    () =>
      (data?.system_activity || []).filter((item) =>
        /takeover|escalat|human/i.test(`${item.event_type} ${item.message}`)
      ).length,
    [data]
  );

  const totalConversations = data?.platform_overview.total_conversations_handled ?? 0;
  const automationRate = totalConversations > 0
    ? clamp(Math.round(((totalConversations - takeoverCount) / totalConversations) * 100), 0, 100)
    : 0;
  const humanTakeoverRate = clamp(100 - automationRate, 0, 100);

  const performanceSeries = useMemo(() => {
    const byDayTakeover = new Map<string, number>();

    (data?.system_activity || []).forEach((item) => {
      const day = formatDay(item.created_at);
      if (!day) {
        return;
      }
      if (!/takeover|escalat|human/i.test(`${item.event_type} ${item.message}`)) {
        return;
      }
      byDayTakeover.set(day, (byDayTakeover.get(day) || 0) + 1);
    });

    return aiSeries.map((point) => {
      const takeover = byDayTakeover.get(point.day) || 0;
      const success = point.count > 0 ? clamp(Math.round(((point.count - takeover) / point.count) * 100), 20, 100) : 0;
      return {
        day: point.day,
        conversations: point.count,
        automation: success,
        takeover,
      };
    });
  }, [aiSeries, data]);

  const notificationsCount = useMemo(() => {
    const critical = (data?.system_activity || []).filter((item) => /error|failed|incident/i.test(item.message));
    return critical.length || 1;
  }, [data]);

  const metricCards: MetricCardItem[] = useMemo(() => {
    const convTrend = trendFromSeries(performanceSeries.map((item) => item.conversations));
    const autoTrend = trendFromSeries(performanceSeries.map((item) => item.automation));
    const takeoverTrend = trendFromSeries(performanceSeries.map((item) => item.takeover));

    return [
      {
        label: "Total AI Conversations",
        value: formatNumber(totalConversations),
        trendText: `${convTrend >= 0 ? "+" : ""}${convTrend}% this week`,
        trendPositive: convTrend >= 0,
      },
      {
        label: "Automation Rate",
        value: `${automationRate}%`,
        trendText: `${autoTrend >= 0 ? "+" : ""}${autoTrend}% this week`,
        trendPositive: autoTrend >= 0,
      },
      {
        label: "Human Takeover Rate",
        value: `${humanTakeoverRate}%`,
        trendText: `${takeoverTrend >= 0 ? "+" : ""}${takeoverTrend}% this week`,
        trendPositive: takeoverTrend <= 0,
      },
      {
        label: "Active AI Employees",
        value: formatNumber(data?.platform_overview.active_bots ?? 0),
        trendText: `${Math.max(1, Math.round((data?.platform_overview.active_users_today ?? 0) / 10))}% this week`,
        trendPositive: true,
      },
    ];
  }, [automationRate, data, humanTakeoverRate, performanceSeries, totalConversations]);

  const conversationRows: ConversationRow[] = useMemo(() => {
    return (data?.system_activity || []).slice(0, 9).map((item) => {
      const customer = item.actor_email ? item.actor_email.split("@")[0] : `customer-${item.id}`;
      const confidence = inferConfidence(item.message, item.event_type);
      const status: ConversationRow["status"] = /takeover|human|escalat/i.test(`${item.event_type} ${item.message}`)
        ? "Human takeover"
        : /train|improve|feedback|needs/i.test(`${item.event_type} ${item.message}`)
          ? "Needs training"
          : "Resolved by AI";

      return {
        id: item.id,
        customer,
        conversationId: extractConversationId(item.message, item.id),
        confidence,
        status,
      };
    });
  }, [data]);

  const topAiEmployees: AiEmployeeRow[] = useMemo(() => {
    const total = Math.max(totalConversations, 1);
    return [
      {
        name: "AI Support Agent",
        handled: Math.round(total * 0.38),
        accuracy: clamp(automationRate + 8, 70, 99),
      },
      {
        name: "AI Sales Assistant",
        handled: Math.round(total * 0.29),
        accuracy: clamp(automationRate + 4, 68, 97),
      },
      {
        name: "AI Operations Helper",
        handled: Math.round(total * 0.19),
        accuracy: clamp(automationRate, 65, 95),
      },
      {
        name: "AI Retention Copilot",
        handled: Math.round(total * 0.14),
        accuracy: clamp(automationRate - 3, 62, 93),
      },
    ];
  }, [automationRate, totalConversations]);

  const query = searchTerm.trim().toLowerCase();

  const filteredConversationRows = useMemo(() => {
    if (!query) {
      return conversationRows;
    }

    return conversationRows.filter((row) =>
      `${row.customer} ${row.conversationId} ${row.status}`.toLowerCase().includes(query)
    );
  }, [conversationRows, query]);

  const filteredAiEmployees = useMemo(() => {
    if (!query) {
      return topAiEmployees;
    }

    return topAiEmployees.filter((row) => row.name.toLowerCase().includes(query));
  }, [topAiEmployees, query]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <main className="min-h-screen bg-[#060a15] text-slate-100">
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden lg:flex"
        style={{ width: `${SIDEBAR_WIDTH_PX}px` }}
      >
        <SidebarContent
          items={sidebarItems}
          onNavigate={closeMobileMenu}
          panelClassName="h-full w-full border-r border-white/10"
        />
      </aside>

      <div className="lg:ml-[240px]">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(7,11,22,0.9)] px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:border-cyan-300/45 hover:text-cyan-100 lg:hidden"
              aria-label={mobileMenuOpen ? t.mobileNav.closeMenu : t.mobileNav.openMenu}
              aria-expanded={mobileMenuOpen}
            >
              <MenuIcon open={mobileMenuOpen} />
            </button>

            <div className="relative flex-1">
              <SearchIcon />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search AI employees, conversations, knowledge base"
                className="h-11 w-full rounded-xl border border-white/15 bg-[#0f1830]/80 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15"
              />
            </div>

            <button
              type="button"
              className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:border-cyan-300/45 hover:text-cyan-100 sm:inline-flex"
              aria-label="Notifications"
            >
              <BellIcon />
              <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-bold text-slate-900">
                {notificationsCount}
              </span>
            </button>

            <LanguageSwitcher className="hidden sm:inline-flex" />

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-left transition hover:border-cyan-300/40"
              aria-label="Admin profile"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-400 text-xs font-bold text-slate-950">
                AD
              </span>
              <span className="hidden text-xs text-slate-200 md:block">
                <span className="block font-semibold text-white">Admin</span>
                <span className="text-[11px] text-slate-400">Control Center</span>
              </span>
            </button>

            <span className={`hidden rounded-lg px-2 py-1 text-[11px] sm:inline-block ${isPolling ? "bg-cyan-300/15 text-cyan-100" : "bg-white/10 text-slate-300"}`}>
              {isPolling ? t.adminPage.syncing : t.adminPage.live}
            </span>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-6 lg:px-8">
          {errorText ? (
            <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-400/10 p-3 text-sm text-rose-100">{errorText}</div>
          ) : null}

          {isAdmin === false ? null : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map((card) => (
                  <MetricCard key={card.label} card={card} />
                ))}
              </section>

              <section className="mt-5 grid gap-4 xl:grid-cols-[1.6fr,1fr]">
                <article className="rounded-2xl border border-white/10 bg-[rgba(18,24,42,0.65)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Performance</p>
                      <h2 className="mt-1 text-lg font-semibold text-white">AI Performance Over Time</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-cyan-300" /> Conversations
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-300" /> Automation
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-300" /> Takeover
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceSeries}>
                        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.16)" />
                        <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(9,14,28,0.95)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="conversations"
                          stroke="#22d3ee"
                          strokeWidth={2.3}
                          dot={false}
                          isAnimationActive
                          animationDuration={900}
                        />
                        <Line
                          type="monotone"
                          dataKey="automation"
                          stroke="#34d399"
                          strokeWidth={2.3}
                          dot={false}
                          isAnimationActive
                          animationDuration={1200}
                        />
                        <Line
                          type="monotone"
                          dataKey="takeover"
                          stroke="#f59e0b"
                          strokeWidth={2.3}
                          dot={false}
                          isAnimationActive
                          animationDuration={1400}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-[rgba(18,24,42,0.65)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">Top AI Employees</h3>
                    <button
                      type="button"
                      className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                    >
                      Manage
                    </button>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {filteredAiEmployees.map((employee) => (
                      <div
                        key={employee.name}
                        className="rounded-xl border border-white/10 bg-[#0d152d]/75 p-3 transition hover:-translate-y-1 hover:border-cyan-300/35 hover:shadow-[0_12px_30px_rgba(8,14,30,0.45)]"
                      >
                        <p className="text-sm font-semibold text-white">{employee.name}</p>
                        <p className="mt-1 text-xs text-slate-300">Handled {formatNumber(employee.handled)} conversations</p>
                        <p className="mt-1 text-xs text-cyan-200">Accuracy {employee.accuracy}%</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="mt-5 grid gap-4 xl:grid-cols-[1.6fr,1fr]">
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,24,42,0.65)] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                    <h3 className="text-base font-semibold text-white">Recent Conversations</h3>
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100" type="button">
                        Filter
                      </button>
                      <button className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100" type="button">
                        Export
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-300">
                          <th className="px-4 py-2.5 font-medium">Customer</th>
                          <th className="px-4 py-2.5 font-medium">Conversation ID</th>
                          <th className="px-4 py-2.5 font-medium">AI Confidence</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                          <th className="px-4 py-2.5 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConversationRows.map((row) => (
                          <tr key={row.id} className="border-b border-white/5 last:border-b-0">
                            <td className="px-4 py-3 text-slate-100">{row.customer}</td>
                            <td className="px-4 py-3 text-slate-300">{row.conversationId}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
                                {row.confidence}%
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                <button type="button" className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-200 transition hover:border-cyan-300/45 hover:text-cyan-100">
                                  View conversation
                                </button>
                                <button type="button" className="rounded-md border border-emerald-300/35 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-100 transition hover:bg-emerald-300/20">
                                  Train AI
                                </button>
                                <button type="button" className="rounded-md border border-amber-300/35 bg-amber-300/10 px-2 py-1 text-xs text-amber-100 transition hover:bg-amber-300/20">
                                  Escalate
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-[rgba(18,24,42,0.65)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur">
                  <h3 className="text-base font-semibold text-white">Feature Controls</h3>
                  <p className="mt-1 text-xs text-slate-400">Toggle platform modules without changing backend schema.</p>
                  <div className="mt-3 space-y-2.5">
                    {(data?.feature_management || []).slice(0, 7).map((feature) => (
                      <div key={feature.feature_key} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                        <span className="text-xs text-slate-200">{feature.display_name}</span>
                        <button
                          type="button"
                          onClick={() => toggleFeature(feature.feature_key, !feature.enabled)}
                          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                            feature.enabled
                              ? "border border-rose-300/35 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20"
                              : "border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"
                          }`}
                        >
                          {feature.enabled ? t.adminPage.disable : t.adminPage.enable}
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-[rgba(0,0,0,0.45)] backdrop-blur-[3px] transition lg:hidden ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={closeMobileMenu}
        aria-hidden={!mobileMenuOpen}
      >
        <aside
          className={`h-full w-[78vw] max-w-[300px] border-r border-white/10 bg-[linear-gradient(180deg,rgba(10,15,30,0.97),rgba(5,10,20,0.97))] p-3 transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <SidebarContent items={sidebarItems} onNavigate={closeMobileMenu} panelClassName="h-full" />
        </aside>
      </div>
    </main>
  );
}

function SidebarContent({
  items,
  onNavigate,
  panelClassName,
}: {
  items: SidebarItem[];
  onNavigate: () => void;
  panelClassName: string;
}) {
  return (
    <div
      className={`${panelClassName} bg-[linear-gradient(180deg,rgba(10,15,30,0.95),rgba(5,10,20,0.95))] px-3 py-4`}
    >
      <div className="mb-6 border-b border-white/10 pb-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">WorkLab</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Admin Center</h2>
      </div>

      <nav className="space-y-1.5">
        {items.map((item) => {
          const isActive = item.href === "/admin";
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center justify-between rounded-xl border px-2.5 py-2 text-sm transition ${
                isActive
                  ? "border-cyan-300/45 bg-cyan-300/14 text-cyan-100"
                  : "border-transparent text-slate-200 hover:border-white/15 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                {item.icon(isActive)}
                <span>{item.label}</span>
              </span>
              {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-cyan-200" /> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function MetricCard({ card }: { card: MetricCardItem }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[rgba(20,25,40,0.6)] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur transition hover:-translate-y-1 hover:border-cyan-300/35 hover:shadow-[0_16px_36px_rgba(7,14,34,0.45)]">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">{card.label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
      <p className={`mt-1 text-xs ${card.trendPositive ? "text-emerald-200" : "text-amber-200"}`}>
        {card.trendPositive ? "↑" : "↓"} {card.trendText}
      </p>
    </article>
  );
}

function StatusBadge({ status }: { status: ConversationRow["status"] }) {
  if (status === "Resolved by AI") {
    return <span className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">Resolved by AI</span>;
  }
  if (status === "Human takeover") {
    return <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-100">Human takeover</span>;
  }
  return <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">Needs training</span>;
}

function trendFromSeries(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const half = Math.floor(values.length / 2);
  const first = average(values.slice(0, half || 1));
  const second = average(values.slice(half));
  if (first === 0) {
    return second > 0 ? 100 : 0;
  }
  return Math.round(((second - first) / first) * 100);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatDay(dateString: string): string | null {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function extractConversationId(message: string, id: number): string {
  const fromMessage = message.match(/(conv[-_ ]?[a-z0-9]+)/i);
  if (fromMessage?.[1]) {
    return fromMessage[1].toUpperCase();
  }
  return `CONV-${String(id).padStart(4, "0")}`;
}

function inferConfidence(message: string, eventType: string): number {
  const context = `${message} ${eventType}`.toLowerCase();
  if (/error|failed|incident/.test(context)) {
    return 62;
  }
  if (/takeover|human|escalat/.test(context)) {
    return 73;
  }
  if (/train|feedback|improve/.test(context)) {
    return 79;
  }
  return 91;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5">
      <span className={`absolute left-0 top-0 h-[2px] w-5 rounded bg-current transition ${open ? "translate-y-[6px] rotate-45" : ""}`} />
      <span className={`absolute left-0 top-[6px] h-[2px] w-5 rounded bg-current transition ${open ? "opacity-0" : ""}`} />
      <span className={`absolute left-0 top-[12px] h-[2px] w-5 rounded bg-current transition ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
    </span>
  );
}

function SearchIcon() {
  return (
    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20L16.6 16.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5a4.5 4.5 0 00-4.5 4.5v2.2c0 .8-.25 1.59-.7 2.25L5.5 14.5h13l-1.3-2.05a4.2 4.2 0 01-.7-2.25V8A4.5 4.5 0 0012 3.5z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.8 18.3a2.5 2.5 0 004.4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function iconBase(active: boolean): string {
  return active ? "text-cyan-100" : "text-slate-400 group-hover:text-slate-100";
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function BotIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="7" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10" cy="12" r="1" fill="currentColor" />
      <circle cx="14" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 017.5 3H19v17H7.5A2.5 2.5 0 015 17.5v-12z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 7h6M9 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6.5h14v9H9l-4 3v-12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 15l3-3 2 2 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h8l4 4v14H7z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15 3v5h4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 12h6M10 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PlugIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3v5M15 3v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 8h10v2a5 5 0 01-5 5 5 5 0 01-5-5V8z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 15v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19.4 12a7.4 7.4 0 01-.08 1l2.08 1.62-2 3.46-2.53-1a7.75 7.75 0 01-1.74 1l-.37 2.66h-4l-.37-2.66a7.74 7.74 0 01-1.73-1l-2.54 1-2-3.46L4.68 13a7.4 7.4 0 010-2L2.6 9.38l2-3.46 2.54 1c.53-.42 1.11-.76 1.73-1l.37-2.66h4l.37 2.66c.62.24 1.2.58 1.74 1l2.53-1 2 3.46L19.32 11c.05.33.08.66.08 1z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CardIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-4 w-4 ${iconBase(active)}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
