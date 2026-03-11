"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import { ApiError, operationsFetch } from "../../lib/operations";

type AnalyticsResponse = {
  cards: {
    messages_handled_today: number;
    active_ai_employees: number;
    automation_rate: number;
    average_response_time_seconds: number;
  };
  charts: {
    messages_per_day: Array<{ day: string; count: number }>;
    ai_vs_human: Array<{ name: string; value: number }>;
    top_customer_questions: Array<{ question: string; count: number }>;
  };
};

const pieColors = ["#22d3ee", "#f97316"];

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await operationsFetch<AnalyticsResponse>("/operations/analytics");
        setData(response);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 402 || error.status === 403)) {
          setErrorText("Advanced analytics requires a paid subscription plan.");
          return;
        }
        setErrorText("Unable to load analytics right now.");
      }
    };

    void run();
  }, []);

  const cards = data?.cards;

  return (
    <section className="animate-fade-in relative mx-auto max-w-7xl">
      <div className="absolute right-0 top-0">
        <LanguageSwitcher />
      </div>

      <header className="reveal-up">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">AI Operations Overview</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Dashboard</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          Monitor AI performance, automation levels, and conversation outcomes in real time.
        </p>
      </header>

      {errorText ? (
        <p className="mt-6 text-sm text-rose-300">
          {errorText}
          {errorText.includes("subscription") ? (
            <Link href="/pricing" className="ml-2 text-cyan-200 underline underline-offset-2">
              Upgrade now
            </Link>
          ) : null}
        </p>
      ) : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Messages handled today" value={String(cards?.messages_handled_today ?? "-")} />
        <MetricCard title="Active AI employees" value={String(cards?.active_ai_employees ?? "-")} />
        <MetricCard title="Automation rate" value={cards ? `${cards.automation_rate}%` : "-"} />
        <MetricCard
          title="Average response time"
          value={cards ? `${cards.average_response_time_seconds}s` : "-"}
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Messages per day">
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

        <ChartCard title="AI vs Human responses">
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

      <div className="mt-5">
        <ChartCard title="Top customer questions">
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

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1224]/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-cyan-300/10 to-[#0a1124]/70 p-5">
      <h2 className="mb-3 text-base font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}
