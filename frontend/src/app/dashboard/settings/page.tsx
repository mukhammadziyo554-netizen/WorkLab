"use client";

import Link from "next/link";

export default function SettingsPage() {
  return (
    <section className="animate-fade-in mx-auto max-w-5xl rounded-2xl border border-white/10 bg-[#0b1122]/80 p-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      <p className="mt-3 text-sm text-slate-300">
        Configure notification preferences, operator access, and escalation policies.
      </p>

      <div className="mt-6 rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
        <p className="text-sm text-cyan-100">Billing, invoices, and subscription management are now in a dedicated page.</p>
        <Link href="/dashboard/settings/billing" className="mt-3 inline-block text-sm font-semibold text-cyan-100 underline underline-offset-4">
          Open billing settings
        </Link>
      </div>
    </section>
  );
}
