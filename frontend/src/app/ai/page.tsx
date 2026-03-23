"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/providers/LanguageProvider";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import MobileTelegramPublicNav from "../../components/ui/MobileTelegramPublicNav";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";

type ChatRole = "user" | "ai";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type AIChatResponse = {
  reply?: string;
};

const CHAT_STORAGE_PREFIX = "worklab-ai-chat-history";

function getWelcomeMessage(language: "en" | "ru" | "uz"): ChatMessage {
  return {
    id: `welcome-${language}`,
    role: "ai",
    content:
      language === "ru"
        ? "Задайте вопрос про автоматизацию, Telegram-ботов или AI сотрудников."
        : language === "uz"
          ? "Avtomatlashtirish, Telegram botlar yoki AI xodimlar haqida savol bering."
          : "Ask about automation, Telegram bots, or AI employees.",
  };
}

function getChatStorageKey(language: "en" | "ru" | "uz"): string {
  return `${CHAT_STORAGE_PREFIX}-${language}`;
}

export default function AIPage() {
  const { language, t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("worklab_session_token");
    const backendBaseUrl = getBackendBaseUrl();
    if (!token || !backendBaseUrl) {
      setIsAuthenticated(false);
      setIsAdmin(false);
      return;
    }

    const checkSession = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/auth/session`, {
          headers: getApiHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });
        if (!response.ok) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          return;
        }

        const data = (await response.json()) as { user?: { role?: string } };
        setIsAuthenticated(true);
        setIsAdmin(data.user?.role === "admin");
      } catch {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    };

    void checkSession();
  }, []);

  useEffect(() => {
    const storageKey = getChatStorageKey(language);
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      setMessages([getWelcomeMessage(language)]);
      setHasLoadedHistory(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      } else {
        setMessages([getWelcomeMessage(language)]);
      }
    } catch {
      setMessages([getWelcomeMessage(language)]);
    } finally {
      setHasLoadedHistory(true);
    }
  }, [language]);

  useEffect(() => {
    if (!hasLoadedHistory) {
      return;
    }

    window.localStorage.setItem(getChatStorageKey(language), JSON.stringify(messages));
  }, [messages, language, hasLoadedHistory]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextText = input.trim();
    if (!nextText || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nextText,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setErrorText(null);
    setIsSending(true);

    try {
      const backendBaseUrl = getBackendBaseUrl();
      if (!backendBaseUrl) {
        throw new Error("Missing backend URL");
      }

      const response = await fetch(`${backendBaseUrl}/ai/chat`, {
        method: "POST",
        headers: getApiHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          message: nextText,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as AIChatResponse;
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content:
          data.reply ||
          (language === "ru"
            ? "Я обработал запрос, но сейчас нет ответа."
            : language === "uz"
              ? "So'rov qabul qilindi, ammo hozircha javob mavjud emas."
              : "I received your request, but no response is available right now."),
      };

      setMessages((previous) => [...previous, aiMessage]);
    } catch {
      setErrorText(
        language === "ru"
          ? "Не удалось подключиться к AI сервису. Попробуйте снова."
          : language === "uz"
            ? "AI xizmatiga ulanib bo'lmadi. Qayta urinib ko'ring."
            : "Could not connect to AI service. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="animate-fade-in relative min-h-screen overflow-x-hidden bg-[#05070f] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="hero-gradient-float absolute left-[50%] top-[-16rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="hero-gradient-float absolute right-[-8rem] top-[10rem] h-[20rem] w-[20rem] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-14 pt-5 sm:px-8">
        <header className="navbar-premium sticky top-4 z-20 rounded-2xl px-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="hidden text-2xl font-bold tracking-tight text-white md:block">
              WorkLab
            </Link>
            <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
              <Link href="/#features" className="transition hover:text-cyan-200">
                {t.nav.features}
              </Link>
              <Link href="/#pricing" className="transition hover:text-cyan-200">
                {t.nav.pricing}
              </Link>
              <Link href="/ai" className="text-cyan-200">
                AI
              </Link>
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="transition hover:text-white">
                    Dashboard
                  </Link>
                  {isAdmin ? (
                    <Link href="/admin" className="transition hover:text-cyan-200">
                      Admin
                    </Link>
                  ) : null}
                  <Link href="/dashboard/profile" className="transition hover:text-white">
                    {t.common.profile}
                  </Link>
                </>
              ) : (
                <Link href="/login" className="transition hover:text-white">
                  {t.nav.login}
                </Link>
              )}
              <Link
                href="/create-employee"
                className="button-glow button-pop inline-flex items-center justify-center rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                {t.nav.createAiEmployee}
              </Link>
              <LanguageSwitcher />
            </nav>

            <div className="md:hidden">
              <MobileTelegramPublicNav isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
            </div>
          </div>
        </header>

        <section className="mx-auto mt-10 max-w-[680px] pb-5">
          <div className="text-center">
            <h1 data-reveal className="scroll-reveal text-3xl font-bold tracking-tight text-white sm:text-4xl">
              WorkLab AI
            </h1>
            <p data-reveal className="scroll-reveal mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              Ask anything about automation, Telegram bots, or AI employees.
            </p>
          </div>

          <div data-reveal className="scroll-reveal mt-6 flex h-[66vh] min-h-[500px] flex-col rounded-3xl border border-white/10 bg-gradient-to-b from-[#101a33]/90 to-[#0b1122]/85 p-3.5 shadow-[0_24px_80px_rgba(4,10,28,0.55)] backdrop-blur-xl sm:p-4">
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[0.84rem] leading-[1.35rem] ${
                        isUser
                          ? "rounded-br-md bg-white/12 text-slate-100"
                          : "rounded-bl-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}

              {isSending ? (
                <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1.5 text-cyan-100">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-200" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-200 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-200 [animation-delay:240ms]" />
                </div>
              ) : null}
            </div>

            <div className="mt-3.5 border-t border-white/10 pt-2.5">
              {errorText ? <p className="mb-2 text-[0.72rem] text-rose-300">{errorText}</p> : null}
              <form onSubmit={sendMessage} className="flex items-center gap-1.5">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={language === "ru" ? "Введите сообщение..." : language === "uz" ? "Xabar yozing..." : "Type your message..."}
                  className="h-10 flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 text-[0.84rem] text-white placeholder:text-slate-400 focus:border-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="button-glow button-pop h-10 rounded-xl bg-cyan-300 px-3.5 text-[0.82rem] font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {language === "ru" ? "Отправить" : language === "uz" ? "Yuborish" : "Send"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
