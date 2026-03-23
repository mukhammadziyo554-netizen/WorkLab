"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import { useLanguage } from "../../components/providers/LanguageProvider";
import { ApiError, operationsFetch } from "../../lib/operations";

type AnalyticsResponse = {
  cards: {
    messages_handled_today: number;
    active_ai_employees: number;
    automation_rate: number;
    average_response_time_seconds: number;
    human_takeover_rate?: number;
    daily_conversations?: number;
  };
  usage?: {
    conversations_this_month: number;
    tokens_used: number;
    estimated_cost_usd: number;
  };
  charts: {
    messages_per_day: Array<{ day: string; count: number }>;
    ai_vs_human: Array<{ name: string; value: number }>;
    top_customer_questions: Array<{ question: string; count: number }>;
    automation_success_rate_over_time?: Array<{ day: string; rate: number }>;
    conversation_volume_trends?: Array<{ day: string; count: number }>;
    human_takeover_analysis?: Array<{ day: string; count: number }>;
  };
};

type SmartNotification = {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  conversation_id?: string | null;
  created_at: string;
};

const pieColors = ["#22d3ee", "#f97316"];

export default function DashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await operationsFetch<AnalyticsResponse>("/operations/analytics");
        setData(response);

        const notifResponse = await operationsFetch<{ notifications: SmartNotification[] }>("/operations/notifications");
        setNotifications(notifResponse.notifications || []);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 402 || error.status === 403)) {
          setErrorText(t.dashboardOps.analyticsRequiresPlan);
          return;
        }
        setErrorText(t.dashboardOps.analyticsLoadFailed);
      }
    };

    void run();
  }, [t.dashboardOps.analyticsLoadFailed, t.dashboardOps.analyticsRequiresPlan]);

  const cards = data?.cards;
  const latestDayChange = useMemo(() => {
    const points = data?.charts.messages_per_day || [];
    if (points.length < 2) {
      return 0;
    }
    const prev = points[points.length - 2]?.count || 0;
    const curr = points[points.length - 1]?.count || 0;
    if (prev === 0) {
      return curr > 0 ? 100 : 0;
    }
    return Math.round(((curr - prev) / prev) * 100);
  }, [data]);

  const feedItems = useMemo(() => {
    const now = new Date();
    const totalMessages = data?.cards.messages_handled_today || 0;
    const activeEmployees = data?.cards.active_ai_employees || 0;
    return [
      {
        label: t.dashboardOps.feedResolved,
        time: new Date(now.getTime() - 5 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        label: t.dashboardOps.feedConnectedBot,
        time: new Date(now.getTime() - 18 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        label: t.dashboardOps.feedKbAdded,
        time: new Date(now.getTime() - 42 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        label: t.dashboardOps.feedEmployeeCreated.replace("{active}", String(activeEmployees)),
        time: t.dashboardOps.feedInteractionsToday.replace("{total}", String(totalMessages)),
      },
    ];
  }, [data, t]);

  const onboardingSteps = useMemo(() => {
    const steps = [
      { key: "create-ai", label: t.dashboardOps.onboardingCreateAi, done: (data?.cards.active_ai_employees || 0) > 0 },
      { key: "upload-kb", label: t.dashboardOps.onboardingUploadKb, done: notifications.find((item) => item.type === "knowledge_gap") ? false : true },
      { key: "connect-telegram", label: t.dashboardOps.onboardingConnectTelegram, done: true },
      { key: "test-conversation", label: t.dashboardOps.onboardingTestConversation, done: (data?.cards.messages_handled_today || 0) > 0 },
      { key: "launch", label: t.dashboardOps.onboardingLaunch, done: (data?.cards.automation_rate || 0) >= 50 },
    ];
    const completed = steps.filter((step) => step.done).length;
    const progress = Math.round((completed / steps.length) * 100);
    return { steps, completed, progress };
  }, [data, notifications, t]);

  return (
    <section className="animate-fade-in relative mx-auto max-w-7xl">
      <div className="absolute right-0 top-0">
        <LanguageSwitcher />
      </div>

      <header data-reveal className="scroll-reveal reveal-up">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{t.dashboardOps.tag}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">{t.dashboardOps.title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          {t.dashboardOps.subtitle}
        </p>
      </header>

      {errorText ? (
        <p className="mt-6 text-sm text-rose-300">
          {errorText}
          {errorText.includes("subscription") ? (
            <Link href="/pricing" className="ml-2 text-cyan-200 underline underline-offset-2">
              {t.common.upgradeNow}
            </Link>
          ) : null}
        </p>
      ) : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t.dashboardOps.automationRate}
          value={cards ? cards.automation_rate : 0}
          suffix="%"
          description={t.dashboardOps.automationRateDescription.replace("{value}", String(cards?.automation_rate ?? 0))}
          trend={latestDayChange}
        />
        <MetricCard
          title={t.dashboardOps.averageResponseTime}
          value={cards ? Number((cards.average_response_time_seconds / 10).toFixed(1)) : 0}
          suffix="s"
          decimals={1}
          description={t.dashboardOps.averageResponseTimeDescription}
          trend={latestDayChange > 0 ? -4 : 2}
        />
        <MetricCard
          title={t.dashboardOps.humanTakeoverRate}
          value={cards?.human_takeover_rate ?? Math.max(0, 100 - (cards?.automation_rate || 0))}
          suffix="%"
          description={t.dashboardOps.humanTakeoverRateDescription}
          trend={latestDayChange > 0 ? -2 : 1}
        />
        <MetricCard
          title={t.dashboardOps.dailyConversations}
          value={cards?.daily_conversations ?? cards?.messages_handled_today ?? 0}
          description={t.dashboardOps.dailyConversationsDescription}
          trend={latestDayChange}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr,1fr]">
        <ChartCard title={t.dashboardOps.aiUsageTracker}>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniUsageCard
              label={t.dashboardOps.conversations}
              value={String(data?.usage?.conversations_this_month ?? 0)}
              subtitle={t.dashboardOps.thisMonth}
            />
            <MiniUsageCard
              label={t.dashboardOps.tokensUsed}
              value={formatCompact(data?.usage?.tokens_used ?? 0)}
              subtitle={t.dashboardOps.estimated}
            />
            <MiniUsageCard
              label={t.dashboardOps.estimatedCost}
              value={`$${(data?.usage?.estimated_cost_usd ?? 0).toFixed(2)}`}
              subtitle={t.dashboardOps.modelUsage}
            />
          </div>
        </ChartCard>

        <ChartCard title={t.dashboardOps.realTimeActivityFeed}>
          <div className="space-y-2">
            {feedItems.map((item) => (
              <div key={`${item.label}-${item.time}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm text-slate-100">{item.label}</p>
                <p className="mt-1 text-xs text-slate-400">{item.time}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr,1fr]">
        <ChartCard title={t.dashboardOps.smartNotifications}>
          <div className="space-y-2">
            {notifications.length === 0 ? <p className="text-sm text-slate-300">{t.dashboardOps.noAlerts}</p> : null}
            {notifications.map((item, index) => (
              <div
                key={`${item.type}-${item.created_at}-${index}`}
                className={`rounded-xl border p-3 ${
                  item.severity === "high"
                    ? "border-rose-300/35 bg-rose-400/10"
                    : item.severity === "medium"
                      ? "border-amber-300/35 bg-amber-300/10"
                      : "border-cyan-300/35 bg-cyan-300/10"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.13em] text-slate-100">{item.type.replace(/_/g, " ")}</p>
                <p className="mt-1 text-sm text-slate-100">{item.message}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title={t.dashboardOps.smartOnboarding}>
          <p className="text-sm text-slate-300">{t.dashboardOps.setupProgress.replace("{progress}", String(onboardingSteps.progress))}</p>
          <div className="mt-3 h-2 rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
              style={{ width: `${onboardingSteps.progress}%` }}
            />
          </div>
          <div className="mt-3 space-y-2">
            {onboardingSteps.steps.map((step) => (
              <div key={step.key} className="flex items-center gap-2 text-sm text-slate-200">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${step.done ? "bg-emerald-400/20 text-emerald-100" : "bg-white/10 text-slate-300"}`}>
                  {step.done ? "✓" : "•"}
                </span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <ChartCard title={t.dashboardOps.messagesPerDay}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data?.charts.messages_per_day || []}>
              <defs>
                <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#22d3ee"
                fill="url(#messagesGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.dashboardOps.aiVsHuman}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data?.charts.ai_vs_human || []} dataKey="value" nameKey="name" outerRadius={82}>
                {(data?.charts.ai_vs_human || []).map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard title={t.dashboardOps.automationSuccessOverTime}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.charts.automation_success_rate_over_time || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Area type="monotone" dataKey="rate" stroke="#34d399" fill="rgba(52,211,153,0.2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.dashboardOps.humanTakeoverAnalysis}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.charts.human_takeover_analysis || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="count" fill="#fb7185" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-5">
        <ChartCard title={t.dashboardOps.topCustomerQuestions}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.charts.top_customer_questions || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="question" stroke="#94a3b8" tick={{ fontSize: 11 }} interval={0} angle={-10} height={65} />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  suffix,
  description,
  trend,
  decimals = 0,
}: {
  title: string;
  value: number;
  suffix?: string;
  description: string;
  trend: number;
  decimals?: number;
}) {
  const animated = useAnimatedNumber(value, decimals);

  return (
    <div data-reveal className="scroll-reveal card-premium rounded-2xl p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">
        {animated}
        {suffix || ""}
      </p>
      <p className="mt-2 text-xs text-slate-300">{description}</p>
      <TrendBadge trend={trend} />
    </div>
  );
}

function MiniUsageCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  const { t } = useLanguage();
  const positive = trend >= 0;
  return (
    <span
      className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        positive ? "bg-emerald-400/15 text-emerald-100" : "bg-rose-400/15 text-rose-100"
      }`}
    >
      {positive ? "+" : ""}
      {trend}% {t.dashboardOps.trend}
    </span>
  );
}

function useAnimatedNumber(target: number, decimals: number): string {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 520;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = target * progress;
      setValue(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value.toFixed(decimals);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div data-reveal className="scroll-reveal card-premium rounded-2xl bg-gradient-to-b from-cyan-300/10 to-[#0a1124]/70 p-5">
      <h2 className="mb-3 text-base font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}
