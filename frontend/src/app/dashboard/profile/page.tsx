"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../components/providers/LanguageProvider";
import { getApiHeaders, getBackendBaseUrl } from "../../../lib/backend";
import { operationsFetch } from "../../../lib/operations";

type SessionPayload = {
  user?: {
    id?: number;
    email?: string;
    role?: string;
    company_name?: string;
    created_at?: string;
    subscription_status?: string;
    subscription_plan?: string;
  };
};

type Employee = { id: number };

type EditableProfile = {
  fullName: string;
  email: string;
  avatarInitials: string;
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [connectedBots, setConnectedBots] = useState(0);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [editableProfile, setEditableProfile] = useState<EditableProfile>({
    fullName: "Admin",
    email: "",
    avatarInitials: "AD",
  });

  useEffect(() => {
    const token = window.localStorage.getItem("worklab_session_token");
    const baseUrl = getBackendBaseUrl();
    if (!token || !baseUrl) {
      setStatusText("Unable to load profile right now.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const sessionResponse = await fetch(`${baseUrl}/auth/session`, {
          headers: getApiHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });

        if (sessionResponse.ok) {
          const sessionData = (await sessionResponse.json()) as SessionPayload;
          setSession(sessionData);
          const email = sessionData.user?.email || "";
          const fullName = sessionData.user?.company_name || email.split("@")[0] || "Admin";
          setEditableProfile({
            fullName,
            email,
            avatarInitials: initialsFromName(fullName),
          });
        }

        try {
          const employees = await operationsFetch<{ employees: Employee[] }>("/operations/ai-employees");
          setEmployeeCount((employees.employees || []).length);
        } catch {
          setEmployeeCount(0);
        }

        try {
          const monitorResponse = await fetch(`${baseUrl}/admin/monitor`, {
            headers: getApiHeaders({
              Authorization: `Bearer ${token}`,
            }),
          });
          if (monitorResponse.ok) {
            const monitorData = (await monitorResponse.json()) as {
              platform_overview?: { active_bots?: number };
            };
            setConnectedBots(monitorData.platform_overview?.active_bots || 0);
          }
        } catch {
          setConnectedBots(0);
        }
      } catch {
        setStatusText("Unable to load profile right now.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const accountId = useMemo(() => {
    const id = session?.user?.id;
    if (!id) {
      return "WL-000000";
    }
    return `WL-${String(id).padStart(6, "0")}`;
  }, [session]);

  const registrationDate = useMemo(() => {
    const value = session?.user?.created_at;
    if (!value) {
      return "January 2026";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "January 2026";
    }
    return date.toLocaleDateString([], { month: "long", year: "numeric" });
  }, [session]);

  const accountRole = (session?.user?.role || "user").toLowerCase() === "admin" ? "Administrator" : "User";
  const accountStatus = "Active";
  const planName = normalizePlanName(session?.user?.subscription_plan, session?.user?.subscription_status);

  const onSaveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusText("Profile changes saved.");
  };

  return (
    <section className="animate-fade-in mx-auto max-w-6xl">
      <header data-reveal className="scroll-reveal mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-300/10 to-[#121a31] p-5">
        <h1 className="text-3xl font-bold text-white">{t.profilePage.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.profilePage.subtitle}</p>
      </header>

      {statusText ? (
        <div className="mb-4 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{statusText}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <article data-reveal className="scroll-reveal card-premium rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white">Account Information</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Name" value={editableProfile.fullName || "Admin"} />
            <Row label="Email" value={editableProfile.email || "admin@worklab.ai"} />
            <Row label="Role" value={accountRole} />
            <Row label="Account ID" value={accountId} />
            <Row label="Member since" value={registrationDate} />
          </dl>
        </article>

        <article data-reveal className="scroll-reveal card-premium rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white">Account Status</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Account Status" value={accountStatus} />
            <Row label="Plan" value={planName} />
            <Row label="AI Employees Created" value={String(employeeCount)} />
            <Row label="Telegram Bots Connected" value={String(connectedBots)} />
          </dl>
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <article data-reveal className="scroll-reveal card-premium rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white">Security Settings</h2>

          <div className="mt-3 space-y-3">
            <button
              type="button"
              className="button-pop w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-cyan-300/40"
              onClick={() => setStatusText("Password reset flow opened.")}
            >
              Change password
            </button>

            <label className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100">
              <span>Two-factor authentication</span>
              <button
                type="button"
                onClick={() => {
                  setTwoFactorEnabled((prev) => !prev);
                  setStatusText(`Two-factor authentication ${!twoFactorEnabled ? "enabled" : "disabled"}.`);
                }}
                className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition ${twoFactorEnabled ? "bg-cyan-300" : "bg-slate-600"}`}
                aria-pressed={twoFactorEnabled}
              >
                <span className={`h-5 w-5 rounded-full bg-white transition ${twoFactorEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </label>

            <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">
              <p className="text-sm font-medium text-white">Active sessions</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                <li>macOS - Chrome - Current session</li>
                <li>Telegram Mini App - iOS - 1 hour ago</li>
              </ul>
            </div>
          </div>
        </article>

        <article data-reveal className="scroll-reveal card-premium rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white">Profile Settings</h2>

          <form className="mt-3 space-y-3" onSubmit={onSaveProfile}>
            <label className="block">
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-300">Name</p>
              <input
                value={editableProfile.fullName}
                onChange={(event) =>
                  setEditableProfile((prev) => ({
                    ...prev,
                    fullName: event.target.value,
                    avatarInitials: initialsFromName(event.target.value),
                  }))
                }
                className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
              />
            </label>

            <label className="block">
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-300">Email</p>
              <input
                value={editableProfile.email}
                onChange={(event) => setEditableProfile((prev) => ({ ...prev, email: event.target.value }))}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
              />
            </label>

            <label className="block">
              <p className="mb-1 text-xs uppercase tracking-[0.12em] text-slate-300">Profile avatar</p>
              <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-400 text-xs font-bold text-slate-900">
                  {editableProfile.avatarInitials}
                </span>
                <span className="text-xs text-slate-300">Auto-generated from your name</span>
              </div>
            </label>

            <button
              type="submit"
              className="button-glow button-pop rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              disabled={loading}
            >
              Save Changes
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <dt className="text-slate-300">{label}</dt>
      <dd className="font-medium text-white">{value}</dd>
    </div>
  );
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) {
    return "AD";
  }
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "AD";
}

function normalizePlanName(plan?: string, status?: string): string {
  if (status !== "active") {
    return "Starter";
  }

  if (!plan) {
    return "Growth";
  }

  const map: Record<string, string> = {
    starter: "Starter",
    pro: "Growth Plan",
    growth: "Growth Plan",
    business: "Business",
  };

  return map[plan.toLowerCase()] || plan;
}
