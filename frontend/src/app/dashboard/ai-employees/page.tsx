"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, operationsFetch } from "../../../lib/operations";

type Employee = {
  id: number;
  name: string;
  role: string;
  language: "en" | "ru" | "uz";
  tone: string;
  knowledge_base_reference: string;
  is_active: boolean;
};

type EmployeeForm = {
  name: string;
  role: string;
  language: "en" | "ru" | "uz";
  tone: string;
  knowledge_base_reference: string;
};

const initialForm: EmployeeForm = {
  name: "",
  role: "Support AI",
  language: "uz",
  tone: "Friendly",
  knowledge_base_reference: "Main KB",
};

export default function AIEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<EmployeeForm>(initialForm);
  const [statusText, setStatusText] = useState<string | null>(null);

  const loadEmployees = async () => {
    const data = await operationsFetch<{ employees: Employee[] }>("/operations/ai-employees");
    setEmployees(data.employees || []);
  };

  useEffect(() => {
    void loadEmployees().catch(() => {
      setStatusText("Unable to load AI employees.");
    });
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusText(null);

    try {
      await operationsFetch("/operations/ai-employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      setStatusText("AI employee created.");
      setForm(initialForm);
      await loadEmployees();
    } catch (error) {
      if (error instanceof ApiError && (error.status === 402 || error.status === 403)) {
        setStatusText("This action requires an active plan with available AI employee slots.");
        return;
      }
      setStatusText("Failed to create AI employee.");
    }
  };

  return (
    <section className="animate-fade-in mx-auto max-w-6xl">
      <header className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-300/10 to-[#121a31] p-5">
        <h1 className="text-3xl font-bold text-white">AI Employees</h1>
        <p className="mt-2 text-sm text-slate-300">Create multiple AI employees with specialized roles and tone.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[360px,1fr]">
        <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-[#0b1122]/80 p-4">
          <h2 className="mb-3 text-base font-semibold text-white">Create AI Employee</h2>

          <Input label="Name" value={form.name} onChange={(value) => setForm((p) => ({ ...p, name: value }))} />
          <Input label="Role" value={form.role} onChange={(value) => setForm((p) => ({ ...p, role: value }))} />

          <label className="mb-3 block">
            <p className="mb-1 text-sm text-slate-200">Language</p>
            <select
              value={form.language}
              onChange={(event) => setForm((p) => ({ ...p, language: event.target.value as EmployeeForm["language"] }))}
              className="h-10 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none"
            >
              <option value="en" className="bg-slate-900">English</option>
              <option value="ru" className="bg-slate-900">Russian</option>
              <option value="uz" className="bg-slate-900">Uzbek</option>
            </select>
          </label>

          <Input label="Response tone" value={form.tone} onChange={(value) => setForm((p) => ({ ...p, tone: value }))} />
          <Input
            label="Knowledge base reference"
            value={form.knowledge_base_reference}
            onChange={(value) => setForm((p) => ({ ...p, knowledge_base_reference: value }))}
          />

          {statusText ? (
            <p className="mb-3 text-sm text-cyan-200">
              {statusText}
              {statusText.includes("requires") ? (
                <Link href="/pricing" className="ml-2 underline underline-offset-2">
                  Upgrade plan
                </Link>
              ) : null}
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Create Employee
          </button>
        </form>

        <div className="rounded-2xl border border-white/10 bg-[#0b1122]/80 p-4">
          <h2 className="mb-3 text-base font-semibold text-white">Active Employees</h2>
          <div className="space-y-2">
            {employees.map((employee) => (
              <div key={employee.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{employee.name}</p>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] text-cyan-100">
                    {employee.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Language: {employee.language.toUpperCase()} | Tone: {employee.tone}
                </p>
                <p className="mt-1 text-xs text-slate-400">Knowledge Base: {employee.knowledge_base_reference || "Not linked"}</p>
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
