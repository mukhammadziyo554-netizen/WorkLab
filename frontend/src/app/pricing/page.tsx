"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../components/providers/LanguageProvider";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";
import { BillingPlan, fetchBillingPlans } from "../../lib/billing";
import Sidebar from "../../components/ui/Sidebar";
import MobileTelegramNav from "../../components/ui/MobileTelegramNav";
import DashboardTopBar from "../../components/ui/DashboardTopBar";

const SESSION_KEY = "worklab_session_token";

type CheckoutResponse = {
  ok: boolean;
  session_id?: string;
  checkout_url?: string;
  requires_redirect?: boolean;
  detail?: string;
};

export default function PricingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro" | "business">("pro");
  const [form, setForm] = useState({
    cardNumber: "",
    cardholderName: "",
    expiryDate: "",
    cvv: "",
    country: "",
    billingEmail: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    void fetchBillingPlans()
      .then((data) => setPlans(data))
      .catch(() => setStatusText(t.pricingPage.loadFailed));
  }, [t]);

  useEffect(() => {
    setHasSession(Boolean(window.localStorage.getItem(SESSION_KEY)));
  }, []);

  const submitCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusText(null);

    const token = window.localStorage.getItem(SESSION_KEY);
    const baseUrl = getBackendBaseUrl();
    if (!token || !baseUrl) {
      setStatusText(t.pricingPage.loginRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${baseUrl}/billing/checkout/session`, {
        method: "POST",
        headers: getApiHeaders({
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }),
        body: JSON.stringify({
          plan: selectedPlan,
          card_number: form.cardNumber,
          cardholder_name: form.cardholderName,
          expiry_date: form.expiryDate,
          cvv: form.cvv,
          country: form.country,
          billing_email: form.billingEmail,
        }),
      });

      const data = (await response.json()) as CheckoutResponse;
      if (!response.ok || !data.ok) {
        setStatusText(data.detail || t.pricingPage.checkoutFailed);
        return;
      }

      if (data.requires_redirect && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      if (!data.session_id) {
        setStatusText(t.pricingPage.missingSession);
        return;
      }

      const confirm = await fetch(`${baseUrl}/billing/checkout/confirm`, {
        method: "POST",
        headers: getApiHeaders({
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }),
        body: JSON.stringify({ session_id: data.session_id }),
      });

      const confirmData = (await confirm.json()) as { ok?: boolean; detail?: string };
      if (!confirm.ok || !confirmData.ok) {
        setStatusText(confirmData.detail || t.pricingPage.confirmFailed);
        return;
      }

      setStatusText(t.pricingPage.activated);
    } catch {
      setStatusText(t.pricingPage.processFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBackToDashboard = () => {
    const referrer = document.referrer || "";
    const isDashboardReferrer = /\/dashboard|\/admin/.test(referrer);

    if (window.history.length > 1 && isDashboardReferrer) {
      router.back();
      return;
    }

    router.push("/admin");
  };

  const pricingContent = (
    <section className="mx-auto max-w-6xl">
      <div className="mb-5">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="button-pop inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-transparent px-3.5 py-2 text-sm text-slate-200 transition hover:border-cyan-300/45 hover:bg-white/5 hover:text-cyan-100"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div data-reveal className="scroll-reveal mb-8 flex items-center justify-between gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-white">{t.pricingPage.title}</h1>
        <Link href="/dashboard/settings/billing" className="text-sm text-cyan-200 underline underline-offset-4">
          {t.common.manageBilling}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const selected = selectedPlan === plan.id;
          const displayName = plan.id === "pro" ? t.pricingPage.growthPlanName : plan.name;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`scroll-reveal card-premium rounded-2xl p-5 text-left ${
                selected
                  ? "border-cyan-300/70 bg-cyan-300/10"
                  : ""
              }`}
              data-reveal
            >
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">{displayName}</p>
              <p className="mt-3 text-4xl font-bold text-white">${plan.price_usd}</p>
              <p className="mt-1 text-sm text-slate-300">{t.pricingPage.perMonth}</p>
              <div className="mt-4 space-y-1 text-xs text-slate-300">
                <p>{t.pricingPage.aiEmployees}: {plan.limits.ai_employees < 0 ? t.pricingPage.unlimited : plan.limits.ai_employees}</p>
                <p>
                  {t.pricingPage.telegramBots}: {plan.id === "starter" ? "1" : plan.id === "pro" ? "5" : t.pricingPage.unlimited}
                </p>
                <p>
                  {t.pricingPage.monthlyConversations}: {plan.id === "starter" ? "500" : plan.id === "pro" ? "5000" : t.pricingPage.unlimited}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-[#0d1428] p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">{t.pricingPage.comparisonTitle}</h2>
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-300">
              <th className="px-3 py-2">{t.pricingPage.feature}</th>
              <th className="px-3 py-2">{t.pricingPage.starter}</th>
              <th className="px-3 py-2">{t.pricingPage.growth}</th>
              <th className="px-3 py-2">{t.pricingPage.business}</th>
            </tr>
          </thead>
          <tbody>
            {[
              [t.pricingPage.aiEmployees, "1", "3", t.pricingPage.unlimited],
              [t.pricingPage.telegramBots, "1", "5", t.pricingPage.unlimited],
              [t.pricingPage.monthlyConversations, "500", "5000", t.pricingPage.unlimited],
              [t.pricingPage.advancedAnalytics, t.pricingPage.basic, t.pricingPage.advanced, t.pricingPage.full],
              [t.pricingPage.prioritySupport, "-", "-", t.pricingPage.included],
            ].map((row) => (
              <tr key={row[0]} className="border-b border-white/5 last:border-b-0">
                <td className="px-3 py-2 text-slate-200">{row[0]}</td>
                <td className="px-3 py-2 text-slate-300">{row[1]}</td>
                <td className="px-3 py-2 text-slate-300">{row[2]}</td>
                <td className="px-3 py-2 text-slate-300">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form data-reveal onSubmit={submitCheckout} className="scroll-reveal mt-8 rounded-2xl border border-white/10 bg-[#0d1428] p-6">
        <h2 className="text-xl font-semibold text-white">{t.pricingPage.checkout}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label={t.pricingPage.cardNumber} value={form.cardNumber} onChange={(value) => setForm((p) => ({ ...p, cardNumber: value }))} />
          <Field label={t.pricingPage.cardholderName} value={form.cardholderName} onChange={(value) => setForm((p) => ({ ...p, cardholderName: value }))} />
          <Field label={t.pricingPage.expiryDate} value={form.expiryDate} onChange={(value) => setForm((p) => ({ ...p, expiryDate: value }))} />
          <Field label={t.pricingPage.cvv} value={form.cvv} onChange={(value) => setForm((p) => ({ ...p, cvv: value }))} />
          <Field label={t.pricingPage.country} value={form.country} onChange={(value) => setForm((p) => ({ ...p, country: value }))} />
          <Field label={t.pricingPage.billingEmail} value={form.billingEmail} onChange={(value) => setForm((p) => ({ ...p, billingEmail: value }))} />
        </div>

        {statusText ? <p className="mt-4 text-sm text-cyan-200">{statusText}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="button-glow button-pop mt-5 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
        >
          {isSubmitting ? t.pricingPage.processing : t.pricingPage.activateSubscription}
        </button>
      </form>
    </section>
  );

  const internalShell = (
    <div className="min-h-screen bg-[#05070f] text-slate-100 md:flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="md:hidden">
        <MobileTelegramNav />
      </div>
      <div className="flex-1">
        <DashboardTopBar searchPlaceholder="Search plans, invoices, and billing settings" />
        <main className="p-5 sm:p-6 lg:p-8">{pricingContent}</main>
      </div>
    </div>
  );

  const publicView = <main className="min-h-screen bg-[#070b16] px-6 py-10 text-slate-100 sm:px-8">{pricingContent}</main>;

  return hasSession ? internalShell : publicView;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <p className="mb-1 text-xs uppercase tracking-[0.14em] text-slate-300">{label}</p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/50 focus:outline-none"
      />
    </label>
  );
}
