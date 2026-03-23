"use client";

import { FormEvent, useEffect, useState } from "react";
import { operationsFetch } from "../../../lib/operations";
import { useLanguage } from "../../../components/providers/LanguageProvider";

type KnowledgeBasePayload = {
  business_description: string;
  products_services: string;
  delivery_rules: string;
  working_hours: string;
  pricing_information: string;
  faq: string;
};

type KnowledgeInsights = {
  summary: string;
  key_topics: string[];
  suggested_faqs: Array<{ question: string; answer: string }>;
  coverage_score: number;
};

const initialState: KnowledgeBasePayload = {
  business_description: "",
  products_services: "",
  delivery_rules: "",
  working_hours: "",
  pricing_information: "",
  faq: "",
};

export default function KnowledgeBasePage() {
  const { t } = useLanguage();
  const [form, setForm] = useState<KnowledgeBasePayload>(initialState);
  const [insights, setInsights] = useState<KnowledgeInsights | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await operationsFetch<{ knowledge_base: KnowledgeBasePayload; insights?: KnowledgeInsights }>("/operations/knowledge-base");
        setForm({ ...initialState, ...(data.knowledge_base || {}) });
        setInsights(data.insights || null);
      } catch {
        setStatusText(t.knowledgeBasePage.loadError);
      }
    };

    void load();
  }, [t.knowledgeBasePage.loadError]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusText(null);

    try {
      const result = await operationsFetch<{ insights?: KnowledgeInsights }>("/operations/knowledge-base", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      setInsights(result.insights || null);
      setStatusText(t.knowledgeBasePage.saved);
    } catch {
      setStatusText(t.knowledgeBasePage.saveError);
    }
  };

  const onDecideSuggestion = async (question: string, answer: string, approved: boolean) => {
    try {
      const data = await operationsFetch<{ insights?: KnowledgeInsights }>("/operations/knowledge-base/faq-suggestions/decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, answer, approved }),
      });

      if (approved) {
        setStatusText(t.knowledgeBasePage.faqApproved);
      } else {
        setStatusText(t.knowledgeBasePage.faqRejected);
      }
      if (data.insights) {
        setInsights(data.insights);
      }
    } catch {
      setStatusText(t.knowledgeBasePage.faqProcessError);
    }
  };

  const setField = (field: keyof KnowledgeBasePayload, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  return (
    <section className="animate-fade-in mx-auto max-w-5xl">
      <header data-reveal className="scroll-reveal mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-300/10 to-[#121a31] p-5">
        <h1 className="text-3xl font-bold text-white">{t.knowledgeBasePage.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.knowledgeBasePage.subtitle}</p>
      </header>

      <form data-reveal onSubmit={onSubmit} className="scroll-reveal card-premium space-y-4 rounded-2xl p-5">
        <Field
          label={t.knowledgeBasePage.businessDescriptionLabel}
          value={form.business_description}
          onChange={(value) => setField("business_description", value)}
          placeholder={t.knowledgeBasePage.businessDescriptionPlaceholder}
        />
        <Field
          label={t.knowledgeBasePage.productsServicesLabel}
          value={form.products_services}
          onChange={(value) => setField("products_services", value)}
          placeholder={t.knowledgeBasePage.productsServicesPlaceholder}
        />
        <Field
          label={t.knowledgeBasePage.deliveryRulesLabel}
          value={form.delivery_rules}
          onChange={(value) => setField("delivery_rules", value)}
          placeholder={t.knowledgeBasePage.deliveryRulesPlaceholder}
        />
        <Field
          label={t.knowledgeBasePage.workingHoursLabel}
          value={form.working_hours}
          onChange={(value) => setField("working_hours", value)}
          placeholder={t.knowledgeBasePage.workingHoursPlaceholder}
        />
        <Field
          label={t.knowledgeBasePage.pricingInformationLabel}
          value={form.pricing_information}
          onChange={(value) => setField("pricing_information", value)}
          placeholder={t.knowledgeBasePage.pricingInformationPlaceholder}
        />
        <Field
          label={t.knowledgeBasePage.faqLabel}
          value={form.faq}
          onChange={(value) => setField("faq", value)}
          placeholder={t.knowledgeBasePage.faqPlaceholder}
        />

        {statusText ? <p className="text-sm text-cyan-200">{statusText}</p> : null}

        <button
          type="submit"
          className="button-glow button-pop rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          {t.knowledgeBasePage.saveButton}
        </button>
      </form>

      {insights ? (
        <section data-reveal className="scroll-reveal mt-5 grid gap-4 md:grid-cols-3">
          <article className="card-premium rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{t.knowledgeBasePage.autoSummary}</p>
            <p className="mt-2 text-sm text-slate-200">{insights.summary || t.knowledgeBasePage.noSummaryYet}</p>
          </article>

          <article className="card-premium rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{t.knowledgeBasePage.keyTopics}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(insights.key_topics || []).length === 0 ? <p className="text-sm text-slate-300">{t.knowledgeBasePage.noTopicsDetected}</p> : null}
              {(insights.key_topics || []).map((topic) => (
                <span key={topic} className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-100">
                  {topic}
                </span>
              ))}
            </div>
          </article>

          <article className="card-premium rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{t.knowledgeBasePage.coverageScore}</p>
            <p className="mt-2 text-2xl font-bold text-white">{insights.coverage_score}%</p>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                style={{ width: `${Math.max(0, Math.min(100, insights.coverage_score))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-300">{t.knowledgeBasePage.coverageNote}</p>
          </article>

          <article className="card-premium rounded-2xl p-4 md:col-span-3">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">{t.knowledgeBasePage.suggestedFaq}</p>
            <div className="mt-3 space-y-2">
              {(insights.suggested_faqs || []).length === 0 ? <p className="text-sm text-slate-300">{t.knowledgeBasePage.noSuggestions}</p> : null}
              {(insights.suggested_faqs || []).map((faq) => (
                <div key={faq.question} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">{t.knowledgeBasePage.questionPrefix}: {faq.question}</p>
                  <p className="mt-1 text-xs text-slate-300">{t.knowledgeBasePage.answerPrefix}: {faq.answer}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void onDecideSuggestion(faq.question, faq.answer, true)}
                      className="button-pop rounded-lg border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100"
                    >
                      {t.knowledgeBasePage.approve}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDecideSuggestion(faq.question, faq.answer, false)}
                      className="button-pop rounded-lg border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-xs font-semibold text-rose-100"
                    >
                      {t.knowledgeBasePage.reject}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <p className="mb-1 text-sm font-medium text-slate-200">{label}</p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none"
      />
    </label>
  );
}
