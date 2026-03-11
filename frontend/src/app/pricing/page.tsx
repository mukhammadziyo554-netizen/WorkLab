"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";
import { BillingPlan, fetchBillingPlans } from "../../lib/billing";

const SESSION_KEY = "worklab_session_token";

type CheckoutResponse = {
  ok: boolean;
  session_id?: string;
  checkout_url?: string;
  requires_redirect?: boolean;
  detail?: string;
};

export default function PricingPage() {
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

  useEffect(() => {
    void fetchBillingPlans()
      .then((data) => setPlans(data))
      .catch(() => setStatusText("Failed to load subscription plans."));
  }, []);

  const submitCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusText(null);

    const token = window.localStorage.getItem(SESSION_KEY);
    const baseUrl = getBackendBaseUrl();
    if (!token || !baseUrl) {
      setStatusText("Please log in before starting checkout.");
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
        setStatusText(data.detail || "Checkout session failed.");
        return;
      }

      if (data.requires_redirect && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      if (!data.session_id) {
        setStatusText("Checkout did not return a session id.");
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
        setStatusText(confirmData.detail || "Payment confirmation failed.");
        return;
      }

      setStatusText("Subscription activated successfully.");
    } catch {
      setStatusText("Unable to process checkout right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070b16] px-6 py-10 text-slate-100 sm:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight text-white">Choose Your WorkLab Plan</h1>
          <Link href="/dashboard/settings/billing" className="text-sm text-cyan-200 underline underline-offset-4">
            Manage Billing
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  selected
                    ? "border-cyan-300/70 bg-cyan-300/10"
                    : "border-white/10 bg-[#0d1428] hover:border-cyan-300/30"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">{plan.name}</p>
                <p className="mt-3 text-4xl font-bold text-white">${plan.price_usd}</p>
                <p className="mt-1 text-sm text-slate-300">per month</p>
                <p className="mt-4 text-xs text-slate-400">
                  AI Employees: {plan.limits.ai_employees < 0 ? "Unlimited" : plan.limits.ai_employees}
                </p>
                <p className="text-xs text-slate-400">Analytics: {plan.limits.analytics}</p>
              </button>
            );
          })}
        </div>

        <form onSubmit={submitCheckout} className="mt-8 rounded-2xl border border-white/10 bg-[#0d1428] p-6">
          <h2 className="text-xl font-semibold text-white">Checkout</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Card number" value={form.cardNumber} onChange={(value) => setForm((p) => ({ ...p, cardNumber: value }))} />
            <Field label="Cardholder name" value={form.cardholderName} onChange={(value) => setForm((p) => ({ ...p, cardholderName: value }))} />
            <Field label="Expiry date (MM/YY)" value={form.expiryDate} onChange={(value) => setForm((p) => ({ ...p, expiryDate: value }))} />
            <Field label="CVV" value={form.cvv} onChange={(value) => setForm((p) => ({ ...p, cvv: value }))} />
            <Field label="Country" value={form.country} onChange={(value) => setForm((p) => ({ ...p, country: value }))} />
            <Field label="Billing email" value={form.billingEmail} onChange={(value) => setForm((p) => ({ ...p, billingEmail: value }))} />
          </div>

          {statusText ? <p className="mt-4 text-sm text-cyan-200">{statusText}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
          >
            {isSubmitting ? "Processing..." : "Activate subscription"}
          </button>
        </form>
      </section>
    </main>
  );
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
