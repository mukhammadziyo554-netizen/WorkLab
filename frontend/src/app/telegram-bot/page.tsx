"use client";

import { useState } from "react";
import { useLanguage } from "../../components/providers/LanguageProvider";
import BackButton from "../../components/ui/BackButton";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import Sidebar from "../../components/ui/Sidebar";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";

export default function TelegramBotPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [botToken, setBotToken] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("Main KB");
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const connectBot = async () => {
    const sessionToken = window.localStorage.getItem("worklab_session_token");
    const backendBaseUrl = getBackendBaseUrl();
    if (!sessionToken || !backendBaseUrl) {
      setStatusText(t.telegramWizard.loginRequired);
      return;
    }

    setIsSubmitting(true);
    setStatusText(null);
    try {
      const response = await fetch(`${backendBaseUrl}/telegram/webhook/configure`, {
        method: "POST",
        headers: getApiHeaders({
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        }),
        body: JSON.stringify({
          bot_token: botToken.trim(),
          webhook_url: `${window.location.origin}/api/telegram/webhook`,
        }),
      });

      if (!response.ok) {
        setStatusText(t.telegramWizard.configureFailed);
        return;
      }

      setStatusText(t.telegramWizard.configured.replace("{knowledgeBase}", knowledgeBase));
      setStep(4);
    } catch {
      setStatusText(t.telegramWizard.connectionFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in min-h-screen bg-[#05070f] text-slate-100 md:flex">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-8 lg:p-10">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>

        <section className="reveal-up mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-slate-900/75 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-8">
          <div className="mb-5">
            <BackButton label={t.nav.back} />
          </div>

          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{t.telegramWizard.tag}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">{t.telegramWizard.title}</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">{t.telegramWizard.subtitle}</p>

          <div className="mt-8 rounded-xl border border-white/10 bg-[#0c1224]/80 p-5">
            <div className="mb-5 grid gap-2 sm:grid-cols-4">
              {t.telegramWizard.steps.map((label, index) => {
                const indexStep = index + 1;
                const active = indexStep <= step;
                return (
                  <div key={label} className={`rounded-lg border px-3 py-2 text-xs ${active ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/5 text-slate-400"}`}>
                    <p className="font-semibold">{t.telegramWizard.step} {indexStep}</p>
                    <p className="mt-1">{label}</p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              {step === 1 ? (
                <div>
                  <p className="text-sm text-slate-200">{t.telegramWizard.step1Description}</p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="button-pop mt-4 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    {t.telegramWizard.createdBot}
                  </button>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <label>
                    <p className="mb-1 text-sm text-slate-200">{t.telegramWizard.step2Label}</p>
                    <input
                      value={botToken}
                      onChange={(event) => setBotToken(event.target.value)}
                      placeholder="123456:ABC..."
                      className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200">{t.telegramWizard.back}</button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!botToken.trim()}
                      className="button-pop rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
                    >
                      {t.telegramWizard.continue}
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <label>
                    <p className="mb-1 text-sm text-slate-200">{t.telegramWizard.step3Label}</p>
                    <input
                      value={knowledgeBase}
                      onChange={(event) => setKnowledgeBase(event.target.value)}
                      className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => setStep(2)} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200">{t.telegramWizard.back}</button>
                    <button
                      type="button"
                      onClick={connectBot}
                      disabled={isSubmitting}
                      className="button-pop rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-40"
                    >
                      {isSubmitting ? t.telegramWizard.connecting : t.telegramWizard.launch}
                    </button>
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                  {t.telegramWizard.step4Complete}
                </div>
              ) : null}
            </div>
          </div>

          {statusText ? <p className="mt-4 text-sm text-cyan-100">{statusText}</p> : null}
          <p className="mt-6 text-sm text-slate-400">{t.telegramWizard.note}</p>
        </section>
      </main>
    </div>
  );
}
