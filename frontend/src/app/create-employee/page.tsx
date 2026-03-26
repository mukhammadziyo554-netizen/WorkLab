"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useLanguage } from "../../components/providers/LanguageProvider";
import BackButton from "../../components/ui/BackButton";
import FormInput from "../../components/ui/FormInput";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import Sidebar from "../../components/ui/Sidebar";

export default function CreateEmployeePage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    telegramToken: "",
    businessName: "",
    businessDescription: "",
    faq: "",
    communicationStyle: "professional",
    responseLength: "medium",
    responseTone: "balanced",
    responseSpeedPriority: "balanced",
    contextMemoryDepth: "10",
  });

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="animate-fade-in min-h-screen bg-[#05070f] text-slate-100 md:flex">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>

        <section className="reveal-up mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900/75 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:p-8">
          <div className="mb-5">
            <BackButton label={t.nav.back} />
          </div>

          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{t.createEmployee.tag}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">{t.createEmployee.title}</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">{t.createEmployee.subtitle}</p>

          <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
            <FormInput
              label={t.createEmployee.telegramTokenLabel}
              name="telegramToken"
              value={form.telegramToken}
              onChange={onChange}
              placeholder={t.createEmployee.telegramTokenPlaceholder}
              required
            />
            <FormInput
              label={t.createEmployee.businessNameLabel}
              name="businessName"
              value={form.businessName}
              onChange={onChange}
              placeholder={t.createEmployee.businessNamePlaceholder}
              required
            />
            <FormInput
              label={t.createEmployee.businessDescriptionLabel}
              name="businessDescription"
              value={form.businessDescription}
              onChange={onChange}
              multiline
              rows={4}
              placeholder={t.createEmployee.businessDescriptionPlaceholder}
              required
            />
            <FormInput
              label={t.createEmployee.faqLabel}
              name="faq"
              value={form.faq}
              onChange={onChange}
              multiline
              rows={6}
              placeholder={t.createEmployee.faqPlaceholder}
              required
            />

            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <p className="mb-1.5 text-sm text-slate-200">{t.createEmployee.communicationStyleLabel}</p>
                <select
                  name="communicationStyle"
                  value={form.communicationStyle}
                  onChange={onChange}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
                >
                  <option value="professional" className="bg-slate-900">{t.createEmployee.communicationStyleOptions.professional}</option>
                  <option value="friendly" className="bg-slate-900">{t.createEmployee.communicationStyleOptions.friendly}</option>
                  <option value="salesAssistant" className="bg-slate-900">{t.createEmployee.communicationStyleOptions.salesAssistant}</option>
                  <option value="technicalSupport" className="bg-slate-900">{t.createEmployee.communicationStyleOptions.technicalSupport}</option>
                  <option value="minimal" className="bg-slate-900">{t.createEmployee.communicationStyleOptions.minimal}</option>
                </select>
              </label>

              <label>
                <p className="mb-1.5 text-sm text-slate-200">{t.createEmployee.responseLengthLabel}</p>
                <select
                  name="responseLength"
                  value={form.responseLength}
                  onChange={onChange}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
                >
                  <option value="short" className="bg-slate-900">{t.createEmployee.responseLengthOptions.short}</option>
                  <option value="medium" className="bg-slate-900">{t.createEmployee.responseLengthOptions.medium}</option>
                  <option value="detailed" className="bg-slate-900">{t.createEmployee.responseLengthOptions.detailed}</option>
                </select>
              </label>

              <label>
                <p className="mb-1.5 text-sm text-slate-200">{t.createEmployee.responseToneLabel}</p>
                <select
                  name="responseTone"
                  value={form.responseTone}
                  onChange={onChange}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
                >
                  <option value="formal" className="bg-slate-900">{t.createEmployee.responseToneOptions.formal}</option>
                  <option value="casual" className="bg-slate-900">{t.createEmployee.responseToneOptions.casual}</option>
                  <option value="balanced" className="bg-slate-900">{t.createEmployee.responseToneOptions.balanced}</option>
                </select>
              </label>

              <label>
                <p className="mb-1.5 text-sm text-slate-200">{t.createEmployee.responseSpeedPriorityLabel}</p>
                <select
                  name="responseSpeedPriority"
                  value={form.responseSpeedPriority}
                  onChange={onChange}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
                >
                  <option value="fast" className="bg-slate-900">{t.createEmployee.responseSpeedPriorityOptions.fast}</option>
                  <option value="balanced" className="bg-slate-900">{t.createEmployee.responseSpeedPriorityOptions.balanced}</option>
                  <option value="thoughtful" className="bg-slate-900">{t.createEmployee.responseSpeedPriorityOptions.thoughtful}</option>
                </select>
              </label>

              <label>
                <p className="mb-1.5 text-sm text-slate-200">{t.createEmployee.contextMemoryDepthLabel}</p>
                <select
                  name="contextMemoryDepth"
                  value={form.contextMemoryDepth}
                  onChange={onChange}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
                >
                  <option value="3" className="bg-slate-900">{t.createEmployee.contextMemoryDepthOptions.depth3}</option>
                  <option value="10" className="bg-slate-900">{t.createEmployee.contextMemoryDepthOptions.depth10}</option>
                  <option value="50" className="bg-slate-900">{t.createEmployee.contextMemoryDepthOptions.depth50}</option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="button-pop mt-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              {t.createEmployee.submit}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
