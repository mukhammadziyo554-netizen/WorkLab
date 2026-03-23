"use client";

import Link from "next/link";
import { useLanguage } from "../../../components/providers/LanguageProvider";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <section data-reveal className="animate-fade-in scroll-reveal card-premium mx-auto max-w-5xl rounded-2xl p-6">
      <h1 className="text-3xl font-bold text-white">{t.settingsPage.title}</h1>
      <p className="mt-3 text-sm text-slate-300">{t.settingsPage.subtitle}</p>

      <div className="card-premium mt-6 rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
        <p className="text-sm text-cyan-100">{t.settingsPage.billingCardText}</p>
        <Link href="/dashboard/settings/billing" className="button-pop mt-3 inline-block text-sm font-semibold text-cyan-100 underline underline-offset-4">
          {t.settingsPage.openBillingSettings}
        </Link>
      </div>
    </section>
  );
}
