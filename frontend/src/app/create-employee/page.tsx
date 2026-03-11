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
  });

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="animate-fade-in min-h-screen bg-[#05070f] text-slate-100 md:flex">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-8 lg:p-10">
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
