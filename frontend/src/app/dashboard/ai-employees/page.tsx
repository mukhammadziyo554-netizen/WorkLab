"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, operationsFetch } from "../../../lib/operations";
import { useLanguage } from "../../../components/providers/LanguageProvider";

type Employee = {
  id: number;
  name: string;
  role: string;
  language: "en" | "ru" | "uz";
  tone: string;
  knowledge_base_reference: string;
  communication_style?: string;
  response_length?: string;
  response_tone?: string;
  response_speed_priority?: string;
  context_memory_depth?: number;
  is_active: boolean;
};

type EmployeeForm = {
  name: string;
  role: string;
  language: "en" | "ru" | "uz";
  tone: string;
  knowledge_base_reference: string;
  communication_style: "Professional" | "Friendly" | "Sales Assistant" | "Technical Support" | "Minimal";
  response_length: "Short" | "Medium" | "Detailed";
  response_tone: "Formal" | "Casual" | "Balanced";
  response_speed_priority: "Fast responses" | "Balanced" | "More thoughtful answers";
  context_memory_depth: 3 | 10 | 50;
};

const initialForm: EmployeeForm = {
  name: "",
  role: "Support AI",
  language: "uz",
  tone: "Friendly",
  knowledge_base_reference: "Main KB",
  communication_style: "Professional",
  response_length: "Medium",
  response_tone: "Balanced",
  response_speed_priority: "Balanced",
  context_memory_depth: 10,
};

export default function AIEmployeesPage() {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  const loadEmployees = async () => {
    const data = await operationsFetch<{ employees: Employee[] }>("/operations/ai-employees");
    setEmployees(data.employees || []);
  };

  useEffect(() => {
    void loadEmployees().catch(() => {
      setStatusText(t.aiEmployeesPage.loadError);
    });
  }, [t.aiEmployeesPage.loadError]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusText(null);
    setRequiresUpgrade(false);

    try {
      await operationsFetch("/operations/ai-employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      setStatusText(t.aiEmployeesPage.created);
      setForm(initialForm);
      await loadEmployees();
    } catch (error) {
      if (error instanceof ApiError && (error.status === 402 || error.status === 403)) {
        setStatusText(t.aiEmployeesPage.planRequired);
        setRequiresUpgrade(true);
        return;
      }
      setStatusText(t.aiEmployeesPage.createError);
    }
  };

  return (
    <section className="animate-fade-in mx-auto max-w-6xl">
      <header data-reveal className="scroll-reveal mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-300/10 to-[#121a31] p-5">
        <h1 className="text-3xl font-bold text-white">{t.aiEmployeesPage.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.aiEmployeesPage.subtitle}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[360px,1fr]">
        <form data-reveal onSubmit={onSubmit} className="scroll-reveal card-premium rounded-2xl p-4">
          <h2 className="mb-3 text-base font-semibold text-white">{t.aiEmployeesPage.createTitle}</h2>

          <Input label={t.aiEmployeesPage.nameLabel} value={form.name} onChange={(value) => setForm((p) => ({ ...p, name: value }))} />
          <Input label={t.aiEmployeesPage.roleLabel} value={form.role} onChange={(value) => setForm((p) => ({ ...p, role: value }))} />

          <label className="mb-3 block">
            <p className="mb-1 text-sm text-slate-200">{t.aiEmployeesPage.languageLabel}</p>
            <select
              value={form.language}
              onChange={(event) => setForm((p) => ({ ...p, language: event.target.value as EmployeeForm["language"] }))}
              className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="en" className="bg-slate-900">{t.aiEmployeesPage.languageEnglish}</option>
              <option value="ru" className="bg-slate-900">{t.aiEmployeesPage.languageRussian}</option>
              <option value="uz" className="bg-slate-900">{t.aiEmployeesPage.languageUzbek}</option>
            </select>
          </label>

          <Input label={t.aiEmployeesPage.responseToneLabel} value={form.tone} onChange={(value) => setForm((p) => ({ ...p, tone: value }))} />

          <label className="mb-3 block">
            <p className="mb-1 text-sm text-slate-200">{t.aiEmployeesPage.communicationStyleLabel}</p>
            <select
              value={form.communication_style}
              onChange={(event) => setForm((p) => ({ ...p, communication_style: event.target.value as EmployeeForm["communication_style"] }))}
              className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="Professional" className="bg-slate-900">{t.aiEmployeesPage.communicationStyleProfessional}</option>
              <option value="Friendly" className="bg-slate-900">{t.aiEmployeesPage.communicationStyleFriendly}</option>
              <option value="Sales Assistant" className="bg-slate-900">{t.aiEmployeesPage.communicationStyleSalesAssistant}</option>
              <option value="Technical Support" className="bg-slate-900">{t.aiEmployeesPage.communicationStyleTechnicalSupport}</option>
              <option value="Minimal" className="bg-slate-900">{t.aiEmployeesPage.communicationStyleMinimal}</option>
            </select>
          </label>

          <label className="mb-3 block">
            <p className="mb-1 text-sm text-slate-200">{t.aiEmployeesPage.responseLengthLabel}</p>
            <select
              value={form.response_length}
              onChange={(event) => setForm((p) => ({ ...p, response_length: event.target.value as EmployeeForm["response_length"] }))}
              className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="Short" className="bg-slate-900">{t.aiEmployeesPage.responseLengthShort}</option>
              <option value="Medium" className="bg-slate-900">{t.aiEmployeesPage.responseLengthMedium}</option>
              <option value="Detailed" className="bg-slate-900">{t.aiEmployeesPage.responseLengthDetailed}</option>
            </select>
          </label>

          <label className="mb-3 block">
            <p className="mb-1 text-sm text-slate-200">{t.aiEmployeesPage.responseToneSelectLabel}</p>
            <select
              value={form.response_tone}
              onChange={(event) => setForm((p) => ({ ...p, response_tone: event.target.value as EmployeeForm["response_tone"] }))}
              className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="Formal" className="bg-slate-900">{t.aiEmployeesPage.responseToneFormal}</option>
              <option value="Casual" className="bg-slate-900">{t.aiEmployeesPage.responseToneCasual}</option>
              <option value="Balanced" className="bg-slate-900">{t.aiEmployeesPage.responseToneBalanced}</option>
            </select>
          </label>

          <label className="mb-3 block">
            <p className="mb-1 text-sm text-slate-200">{t.aiEmployeesPage.responseSpeedPriorityLabel}</p>
            <select
              value={form.response_speed_priority}
              onChange={(event) =>
                setForm((p) => ({
                  ...p,
                  response_speed_priority: event.target.value as EmployeeForm["response_speed_priority"],
                }))
              }
              className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="Fast responses" className="bg-slate-900">{t.aiEmployeesPage.responseSpeedFast}</option>
              <option value="Balanced" className="bg-slate-900">{t.aiEmployeesPage.responseSpeedBalanced}</option>
              <option value="More thoughtful answers" className="bg-slate-900">{t.aiEmployeesPage.responseSpeedThoughtful}</option>
            </select>
          </label>

          <label className="mb-3 block">
            <p className="mb-1 text-sm text-slate-200">{t.aiEmployeesPage.contextMemoryDepthLabel}</p>
            <select
              value={String(form.context_memory_depth)}
              onChange={(event) =>
                setForm((p) => ({
                  ...p,
                  context_memory_depth: Number(event.target.value) as EmployeeForm["context_memory_depth"],
                }))
              }
              className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="3" className="bg-slate-900">{t.aiEmployeesPage.contextMemory3}</option>
              <option value="10" className="bg-slate-900">{t.aiEmployeesPage.contextMemory10}</option>
              <option value="50" className="bg-slate-900">{t.aiEmployeesPage.contextMemory50}</option>
            </select>
          </label>

          <Input
            label={t.aiEmployeesPage.knowledgeBaseReferenceLabel}
            value={form.knowledge_base_reference}
            onChange={(value) => setForm((p) => ({ ...p, knowledge_base_reference: value }))}
          />

          {statusText ? (
            <p className="mb-3 text-sm text-cyan-200">
              {statusText}
              {requiresUpgrade ? (
                <Link href="/pricing" className="ml-2 underline underline-offset-2">
                  {t.aiEmployeesPage.upgradePlan}
                </Link>
              ) : null}
            </p>
          ) : null}

          <button
            type="submit"
            className="button-glow button-pop rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            {t.aiEmployeesPage.createEmployeeButton}
          </button>
        </form>

        <div data-reveal className="scroll-reveal card-premium rounded-2xl p-4">
          <h2 className="mb-3 text-base font-semibold text-white">{t.aiEmployeesPage.activeEmployeesTitle}</h2>
          {employees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-cyan-300/30 bg-cyan-300/8 p-4">
              <p className="text-sm text-slate-200">{t.aiEmployeesPage.noEmployeesYet}</p>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="button-pop mt-3 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                {t.aiEmployeesPage.createAiEmployeeCta}
              </button>
            </div>
          ) : null}
          <div className="space-y-2">
            {employees.map((employee) => (
              <div key={employee.id} className="card-premium rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{employee.name}</p>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] text-cyan-100">
                    {employee.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {t.aiEmployeesPage.languageLabel}: {employee.language.toUpperCase()} | {t.aiEmployeesPage.responseToneLabel}: {employee.tone}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {t.aiEmployeesPage.styleLabel}: {employee.communication_style || t.aiEmployeesPage.communicationStyleProfessional} | {t.aiEmployeesPage.lengthLabel}: {employee.response_length || t.aiEmployeesPage.responseLengthMedium} | {t.aiEmployeesPage.toneLabel}: {employee.response_tone || t.aiEmployeesPage.responseToneBalanced}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {t.aiEmployeesPage.speedLabel}: {employee.response_speed_priority || t.aiEmployeesPage.responseSpeedBalanced} | {t.aiEmployeesPage.memoryLabel}: {employee.context_memory_depth || 10} {t.aiEmployeesPage.messagesSuffix}
                </p>
                <p className="mt-1 text-xs text-slate-400">{t.aiEmployeesPage.knowledgeBaseLabel}: {employee.knowledge_base_reference || t.aiEmployeesPage.notLinked}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mb-3 block">
      <p className="mb-1 text-sm text-slate-200">{label}</p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
      />
    </label>
  );
}
