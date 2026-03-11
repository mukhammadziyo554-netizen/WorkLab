"use client";

import { useLanguage } from "../../components/providers/LanguageProvider";
import BackButton from "../../components/ui/BackButton";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import Sidebar from "../../components/ui/Sidebar";

const botFileSnippet = `# backend/telegram_bot.py
from dataclasses import dataclass
from typing import Any

@dataclass
class IncomingTelegramMessage:
    chat_id: int
    text: str
    update_id: int | None = None

# parse_telegram_update(...)
# build_send_message_payload(...)
# build_set_webhook_request(...)`;

const webhookSnippet = `# backend/main.py
@app.post("/telegram/webhook")
async def receive_telegram_webhook(update: dict[str, Any]) -> dict[str, Any]:
    incoming = parse_telegram_update(update)
    if incoming is None:
        return {"ok": True, "status": "ignored"}

    ai_result = generate_ai_response(incoming.text)
    reply_payload = build_send_message_payload(incoming.chat_id, ai_result.text)
    return {"ok": True, "status": "processed", "telegram_send_payload": reply_payload}`;

const aiSnippet = `# backend/ai_agent.py
def generate_ai_response(message_text: str) -> AIResponse:
    normalized = message_text.strip().lower()
    if "deliver" in normalized or "delivery" in normalized:
        return AIResponse(text="Yes, delivery takes 2-3 days and costs 30,000 UZS.", confidence=0.72)

    return AIResponse(text="Thanks for your message. I am your WorkLab AI employee.", confidence=0.45)`;

export default function TelegramBotPage() {
  const { language, t } = useLanguage();

  const copy = {
    en: {
      tag: "Telegram Integration",
      title: "Telegram Bot Code",
      subtitle: "This page contains the dedicated Python backend files and endpoints used for Telegram bot processing.",
      section1: "Bot Parser and Payload Builder",
      section2: "Webhook Receiver Endpoint",
      section3: "AI Response Placeholder",
      note: "Source files live in backend and are ready for real Telegram API calls.",
    },
    ru: {
      tag: "Интеграция Telegram",
      title: "Код Telegram бота",
      subtitle: "На этой странице показаны отдельные Python файлы и endpoint-ы backend для обработки Telegram бота.",
      section1: "Парсер бота и сборка payload",
      section2: "Endpoint приема webhook",
      section3: "Заглушка AI ответа",
      note: "Исходные файлы находятся в backend и готовы для подключения реальных вызовов Telegram API.",
    },
    uz: {
      tag: "Telegram integratsiyasi",
      title: "Telegram bot kodi",
      subtitle: "Bu sahifada Telegram botini qayta ishlash uchun ishlatiladigan alohida Python backend fayllari va endpointlar ko'rsatilgan.",
      section1: "Bot parseri va payload yig'ish",
      section2: "Webhook qabul qilish endpointi",
      section3: "AI javob uchun vaqtinchalik funksiya",
      note: "Asl fayllar backend papkasida joylashgan va haqiqiy Telegram API chaqiruvlari uchun tayyor.",
    },
  }[language];

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

          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">{copy.tag}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">{copy.title}</h1>
          <p className="mt-4 text-base leading-7 text-slate-300">{copy.subtitle}</p>

          <div className="mt-8 grid gap-6">
            <article className="rounded-xl border border-white/10 bg-[#0c1224]/80 p-5">
              <h2 className="mb-3 text-lg font-semibold text-white">{copy.section1}</h2>
              <pre className="overflow-x-auto rounded-lg bg-[#0a0f1d] p-4 text-xs leading-6 text-cyan-100">
                <code>{botFileSnippet}</code>
              </pre>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1224]/80 p-5">
              <h2 className="mb-3 text-lg font-semibold text-white">{copy.section2}</h2>
              <pre className="overflow-x-auto rounded-lg bg-[#0a0f1d] p-4 text-xs leading-6 text-cyan-100">
                <code>{webhookSnippet}</code>
              </pre>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1224]/80 p-5">
              <h2 className="mb-3 text-lg font-semibold text-white">{copy.section3}</h2>
              <pre className="overflow-x-auto rounded-lg bg-[#0a0f1d] p-4 text-xs leading-6 text-cyan-100">
                <code>{aiSnippet}</code>
              </pre>
            </article>
          </div>

          <p className="mt-6 text-sm text-slate-400">{copy.note}</p>
        </section>
      </main>
    </div>
  );
}
