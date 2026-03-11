"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";

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

const SESSION_KEY = "worklab_session_token";

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminMonitorResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const loadAdminData = async () => {
    const token = window.localStorage.getItem(SESSION_KEY);
    const backendBaseUrl = getBackendBaseUrl();
    if (!token || !backendBaseUrl) {
      setErrorText("Session is missing. Please log in.");
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
        setErrorText("Session expired. Please log in again.");
        router.replace("/login");
        return;
      }

      const sessionData = (await sessionResponse.json()) as {
        user?: { role?: string };
      };

      const role = sessionData.user?.role || "user";
      if (role !== "admin") {
        setIsAdmin(false);
        setErrorText("Admin access required.");
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
        setErrorText("Failed to load admin monitoring data.");
        return;
      }

      const monitorData = (await monitorResponse.json()) as AdminMonitorResponse;
      setData(monitorData);
      setErrorText(null);
    } catch {
      setErrorText("Could not connect to backend admin endpoints.");
    }
  };

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
  }, [router]);

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
        setErrorText("Failed to toggle feature state.");
        return;
      }
      await loadAdminData();
    } catch {
      setErrorText("Failed to toggle feature state.");
    }
  };

  const registrations = useMemo(() => data?.user_analytics.registrations_over_time || [], [data]);
  const dailyActive = useMemo(() => data?.user_analytics.daily_active_users || [], [data]);
  const aiInteractions = useMemo(() => data?.user_analytics.ai_interactions_per_day || [], [data]);
  const subscriptionGrowth = useMemo(() => data?.subscription_analytics.growth_over_time || [], [data]);

  return (
    <main className="min-h-screen bg-[#060a15] px-6 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-cyan-300/10 via-[#0f1934] to-[#111b35] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Admin Control Panel</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Platform Monitoring</h1>
              <p className="mt-2 text-sm text-slate-300">Live system analytics, feature control, and activity stream. Auto-refresh: 5s.</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/dashboard" className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-slate-200 hover:border-cyan-300/40 hover:text-white">
                Dashboard
              </Link>
              <span className={`rounded-lg px-3 py-2 ${isPolling ? "bg-cyan-300/15 text-cyan-100" : "bg-white/10 text-slate-300"}`}>
                {isPolling ? "Syncing..." : "Live"}
              </span>
            </div>
          </div>
        </header>

        {errorText ? (
          <div className="mb-5 rounded-xl border border-rose-300/40 bg-rose-400/10 p-4 text-sm text-rose-100">{errorText}</div>
        ) : null}

        {isAdmin === false ? null : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard title="Total Users" value={String(data?.platform_overview.total_users ?? 0)} />
              <MetricCard title="Active Users Today" value={String(data?.platform_overview.active_users_today ?? 0)} />
              <MetricCard title="AI Employees Created" value={String(data?.platform_overview.ai_employees_created ?? 0)} />
              <MetricCard title="Total Conversations Handled" value={String(data?.platform_overview.total_conversations_handled ?? 0)} />
              <MetricCard title="Active Bots" value={String(data?.platform_overview.active_bots ?? 0)} />
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-2">
              <ChartCard title="User Registrations Over Time">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={registrations}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="day" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#22d3ee" fill="#22d3ee33" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Daily Active Users">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyActive}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="day" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-2">
              <ChartCard title="AI Interactions Per Day">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={aiInteractions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="day" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#34d399" fill="#34d39933" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="rounded-2xl border border-white/10 bg-[#0b1225]/80 p-5 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">Subscription Analytics</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <MiniCard label="Free Users" value={String(data?.subscription_analytics.cards.free_users ?? 0)} />
                  <MiniCard label="Subscribed Users" value={String(data?.subscription_analytics.cards.subscribed_users ?? 0)} />
                  <MiniCard label="Active Subscriptions" value={String(data?.subscription_analytics.cards.active_subscriptions ?? 0)} />
                  <MiniCard label="Expired Subscriptions" value={String(data?.subscription_analytics.cards.expired_subscriptions ?? 0)} />
                </div>
                <p className="mt-3 text-sm text-cyan-100">Monthly Revenue: ${data?.subscription_analytics.cards.monthly_revenue_usd ?? 0}</p>
                <div className="mt-4 h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subscriptionGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                      <XAxis dataKey="day" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr,1fr]">
              <div className="rounded-2xl border border-white/10 bg-[#0b1225]/80 p-5 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">Feature Management</h2>
                <p className="mt-1 text-sm text-slate-300">Enable or disable platform modules globally.</p>
                <div className="mt-4 space-y-2">
                  {(data?.feature_management || []).map((feature) => (
                    <div key={feature.feature_key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{feature.display_name}</p>
                        <p className="text-xs text-slate-400">{feature.enabled ? "enabled" : "disabled"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFeature(feature.feature_key, !feature.enabled)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          feature.enabled
                            ? "border border-rose-300/35 bg-rose-400/10 text-rose-100 hover:bg-rose-400/15"
                            : "border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20"
                        }`}
                      >
                        {feature.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b1225]/80 p-5 backdrop-blur">
                <h2 className="text-lg font-semibold text-white">System Activity</h2>
                <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {(data?.system_activity || []).map((event) => (
                    <div key={event.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-sm text-slate-100">{event.message}</p>
                      <p className="mt-1 text-xs text-slate-400">{event.created_at} {event.actor_email ? `- ${event.actor_email}` : ""}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1225]/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur transition hover:border-cyan-300/35">
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1225]/80 p-5 backdrop-blur">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
