"use client";

import { FormEvent, useEffect, useState } from "react";
import { operationsFetch } from "../../../lib/operations";

type KnowledgeBasePayload = {
  business_description: string;
  products_services: string;
  delivery_rules: string;
  working_hours: string;
  pricing_information: string;
  faq: string;
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
  const [form, setForm] = useState<KnowledgeBasePayload>(initialState);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await operationsFetch<{ knowledge_base: KnowledgeBasePayload }>("/operations/knowledge-base");
        setForm({ ...initialState, ...(data.knowledge_base || {}) });
      } catch {
        setStatusText("Could not load knowledge base.");
      }
    };

    void load();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusText(null);

    try {
      await operationsFetch("/operations/knowledge-base", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      setStatusText("Knowledge base saved.");
    } catch {
      setStatusText("Failed to save knowledge base.");
    }
  };

  const setField = (field: keyof KnowledgeBasePayload, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  return (
    <section className="animate-fade-in mx-auto max-w-5xl">
      <header className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-300/10 to-[#121a31] p-5">
        <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
        <p className="mt-2 text-sm text-slate-300">Teach AI employees about your business, delivery rules, pricing, and FAQ.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-[#0b1122]/80 p-5">
        <Field
          label="Business Description"
          value={form.business_description}
          onChange={(value) => setField("business_description", value)}
          placeholder="Describe your business and support process"
        />
        <Field
          label="Products or Services"
          value={form.products_services}
          onChange={(value) => setField("products_services", value)}
          placeholder="List products/services"
        />
        <Field
          label="Delivery Rules"
          value={form.delivery_rules}
          onChange={(value) => setField("delivery_rules", value)}
          placeholder="Delivery cost: 30,000 UZS; Delivery time: 2-3 days"
        />
        <Field
          label="Working Hours"
          value={form.working_hours}
          onChange={(value) => setField("working_hours", value)}
          placeholder="09:00-18:00"
        />
        <Field
          label="Pricing Information"
          value={form.pricing_information}
          onChange={(value) => setField("pricing_information", value)}
          placeholder="Describe pricing logic"
        />
        <Field
          label="FAQ"
          value={form.faq}
          onChange={(value) => setField("faq", value)}
          placeholder="Common customer questions and approved answers"
        />

        {statusText ? <p className="text-sm text-cyan-200">{statusText}</p> : null}

        <button
          type="submit"
          className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Save Knowledge Base
        </button>
      </form>
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
