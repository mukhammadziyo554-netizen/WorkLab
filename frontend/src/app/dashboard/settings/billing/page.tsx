"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getApiHeaders, getBackendBaseUrl } from "../../../../lib/backend";
import { BillingStatus, fetchBillingStatus } from "../../../../lib/billing";
import { useLanguage } from "../../../../components/providers/LanguageProvider";

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
  const { t } = useLanguage();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);

  const load = useCallback(async () => {
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
      setStatusText(t.billingPage.loadError);
    }
  }, [t.billingPage.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

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
        setStatusText(t.billingPage.cancelFailed);
        return;
      }
      setStatusText(t.billingPage.cancelled);
      await load();
    } catch {
      setStatusText(t.billingPage.cancelFailed);
    }
  };

  return (
    <section className="animate-fade-in mx-auto max-w-5xl">
      <header data-reveal className="scroll-reveal card-premium rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">{t.mobileNav.billing}</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{t.billingPage.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.billingPage.subtitle}</p>
      </header>

      <div data-reveal className="scroll-reveal card-premium mt-4 rounded-2xl p-5">
        <p className="text-sm text-slate-300">{t.billingPage.currentPlan}: <span className="font-semibold text-white">{billing?.subscription_plan || "-"}</span></p>
        <p className="mt-1 text-sm text-slate-300">{t.billingPage.status}: <span className="font-semibold text-white">{billing?.subscription_status || "-"}</span></p>
        <p className="mt-1 text-sm text-slate-300">{t.billingPage.card}: <span className="font-semibold text-white">{billing?.payment_method_brand || "-"} {billing?.payment_method_last4 ? `****${billing.payment_method_last4}` : ""}</span></p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/pricing" className="button-pop rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
            {t.billingPage.changePlan}
          </Link>
          <button
            type="button"
            onClick={cancelSubscription}
            className="button-pop rounded-lg border border-rose-300/40 bg-rose-400/10 px-4 py-2 text-sm text-rose-100"
          >
            {t.billingPage.cancelSubscription}
          </button>
        </div>
        {statusText ? <p className="mt-3 text-sm text-cyan-200">{statusText}</p> : null}
      </div>

      <div data-reveal className="scroll-reveal card-premium mt-4 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-white">{t.billingPage.recentPayments}</h2>
        <div className="mt-3 space-y-2">
          {history.length === 0 ? <p className="text-sm text-slate-400">{t.billingPage.noPaymentsYet}</p> : null}
          {history.map((item) => (
            <div key={item.id} className="card-premium rounded-lg p-3 text-sm text-slate-200">
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
