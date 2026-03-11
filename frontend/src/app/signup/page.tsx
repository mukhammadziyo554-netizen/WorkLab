"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { useLanguage } from "../../components/providers/LanguageProvider";
import FormInput from "../../components/ui/FormInput";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
  });

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <main className="animate-fade-in relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070f] px-6 py-10 text-white">
      <div className="absolute right-6 top-6 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="glow-drift-cyan absolute left-1/2 top-[-12rem] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="glow-drift-purple absolute right-[8%] top-[22%] h-[18rem] w-[18rem] rounded-full bg-purple-500/15 blur-3xl" />
      </div>

      <section className="reveal-up w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/75 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h1 className="text-4xl font-bold tracking-tight text-white">{t.signup.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{t.signup.subtitle}</p>

        <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
          <FormInput
            label={t.signup.companyNameLabel}
            name="companyName"
            value={form.companyName}
            onChange={onChange}
            placeholder={t.signup.companyNamePlaceholder}
            required
          />
          <FormInput
            label={t.signup.emailLabel}
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder={t.signup.emailPlaceholder}
            required
          />
          <FormInput
            label={t.signup.passwordLabel}
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            placeholder={t.signup.passwordPlaceholder}
            required
          />

          <button
            type="submit"
            className="button-pop mt-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            {t.signup.submit}
          </button>
        </form>
      </section>
    </main>
  );
}
