"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiHeaders, getBackendBaseUrl } from "../../../../lib/backend";
import { BillingStatus, fetchBillingStatus } from "../../../../lib/billing";

const SESSION_KEY = "worklab_session_token";

type BillingHistoryItem = {
  id: number;
  plan: string;
  amount_usd: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
};

export default function BillingSettingsPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);

  const load = async () => {
    try {
      const status = await fetchBillingStatus();
      setBilling(status);

      const token = window.localStorage.getItem(SESSION_KEY);
      const baseUrl = getBackendBaseUrl();
      const response = await fetch(`${baseUrl}/billing/history`, {
        headers: getApiHeaders({
          Authorization: `Bearer ${token}`,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { history?: BillingHistoryItem[] };
        setHistory(data.history || []);
      }
    } catch {
      setStatusText("Unable to load billing details.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const cancelSubscription = async () => {
    const token = window.localStorage.getItem(SESSION_KEY);
    const baseUrl = getBackendBaseUrl();
    if (!token || !baseUrl) {
      return;
    }

    setStatusText(null);
    try {
      const response = await fetch(`${baseUrl}/billing/cancel`, {
        method: "POST",
        headers: getApiHeaders({
          Authorization: `Bearer ${token}`,
        }),
      });
      if (!response.ok) {
        setStatusText("Failed to cancel subscription.");
        return;
      }
      setStatusText("Subscription cancelled.");
      await load();
    } catch {
      setStatusText("Failed to cancel subscription.");
    }
  };

  return (
    <section className="animate-fade-in mx-auto max-w-5xl">
      <header className="rounded-2xl border border-white/10 bg-[#0b1122]/80 p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Billing</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Subscription and Payments</h1>
        <p className="mt-2 text-sm text-slate-300">Manage plan, payment method, and invoices for your workspace.</p>
      </header>

      <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1122]/80 p-5">
        <p className="text-sm text-slate-300">Current plan: <span className="font-semibold text-white">{billing?.subscription_plan || "-"}</span></p>
        <p className="mt-1 text-sm text-slate-300">Status: <span className="font-semibold text-white">{billing?.subscription_status || "-"}</span></p>
        <p className="mt-1 text-sm text-slate-300">Card: <span className="font-semibold text-white">{billing?.payment_method_brand || "-"} {billing?.payment_method_last4 ? `****${billing.payment_method_last4}` : ""}</span></p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
            Change plan
          </Link>
          <button
            type="button"
            onClick={cancelSubscription}
            className="rounded-lg border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm text-rose-100"
          >
            Cancel subscription
          </button>
        </div>
        {statusText ? <p className="mt-3 text-sm text-cyan-200">{statusText}</p> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1122]/80 p-5">
        <h2 className="text-lg font-semibold text-white">Recent payments</h2>
        <div className="mt-3 space-y-2">
          {history.length === 0 ? <p className="text-sm text-slate-400">No payments yet.</p> : null}
          {history.map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
              <p>
                {item.plan.toUpperCase()} - ${item.amount_usd} {item.currency} - {item.status}
              </p>
              <p className="text-xs text-slate-400">{item.provider} - {item.created_at}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
