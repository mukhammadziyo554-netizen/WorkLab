"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useLanguage } from "../../components/providers/LanguageProvider";
import FormInput from "../../components/ui/FormInput";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import { getApiHeaders, getBackendBaseUrl, getBackendConnectionErrorMessage } from "../../lib/backend";
import { setSessionToken } from "../../lib/session";

type AuthMode = "login" | "signup";
type AuthResponse = {
  ok: boolean;
  token?: string;
};

const PASSWORD_MIN_LENGTH = 8;

function getPasswordStrength(password: string): {
  score: number;
  label: "Weak" | "Medium" | "Strong";
} {
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: "Weak" };
  if (score <= 4) return { score, label: "Medium" };
  return { score, label: "Strong" };
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    window.Telegram?.WebApp?.expand?.();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      setBackendOnline(false);
      return;
    }

    const checkBackend = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/health`, {
          method: "GET",
          cache: "no-store",
          headers: getApiHeaders(),
        });
        if (!isCancelled) {
          setBackendOnline(response.ok);
        }
      } catch {
        if (!isCancelled) {
          setBackendOnline(false);
        }
      }
    };

    void checkBackend();
    const intervalId = window.setInterval(() => {
      void checkBackend();
    }, 15000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  };

  const onBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === "signup") {
      if (form.password !== form.confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      const strength = getPasswordStrength(form.password);
      if (strength.label === "Weak") {
        setErrorMessage(
          "Password is too weak. Use at least 8 characters with upper/lowercase letters, numbers, and symbols.",
        );
        return;
      }
    }

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      setErrorMessage(getBackendConnectionErrorMessage());
      return;
    }

    const submitAuth = async () => {
      setIsSubmitting(true);
      try {
        const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
        const payload =
          mode === "signup"
            ? {
                company_name: form.companyName,
                email: form.email,
                password: form.password,
              }
            : {
                email: form.email,
                password: form.password,
              };

        const response = await fetch(`${backendBaseUrl}${endpoint}`, {
          method: "POST",
          headers: getApiHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as AuthResponse & { detail?: string };

        if (!response.ok || !data.ok || !data.token) {
          setErrorMessage(data.detail || "Authentication failed. Please check your details.");
          return;
        }

        setSessionToken(data.token);
        setSuccessMessage(mode === "signup" ? "Account created successfully." : "Logged in successfully.");
        router.push("/dashboard");
      } catch {
        setErrorMessage(getBackendConnectionErrorMessage());
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitAuth();
  };

  const isSignupMode = mode === "signup";
  const passwordStrength = getPasswordStrength(form.password);
  const backendBaseUrl = getBackendBaseUrl();

  const openBackendDocs = () => {
    if (!backendBaseUrl) {
      setErrorMessage(getBackendConnectionErrorMessage());
      return;
    }
    const docsUrl = `${backendBaseUrl}/docs`;
    window.open(docsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="animate-fade-in relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070f] px-6 py-10 text-white">
      <div className="absolute right-6 top-6 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="glow-drift-purple absolute left-[24%] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-purple-500/15 blur-3xl" />
        <div className="glow-drift-cyan absolute right-[16%] top-[18%] h-[18rem] w-[18rem] rounded-full bg-cyan-400/15 blur-3xl" />
      </div>

      <section className="reveal-up w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/75 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t.nav.back}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-transparent text-slate-200 transition hover:border-cyan-200/60 hover:bg-white/5 hover:text-cyan-100"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M14 6L8 12L14 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <Link href="/" className="text-2xl font-bold tracking-tight text-white transition hover:text-cyan-100">
            WorkLab
          </Link>

          <div className="w-10" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0b1020]/70 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "login"
                ? "bg-cyan-300 text-slate-950"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t.nav.login}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "signup"
                ? "bg-cyan-300 text-slate-950"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t.signup.submit}
          </button>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white">
          {isSignupMode ? t.signup.title : t.login.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {isSignupMode ? t.signup.subtitle : t.login.subtitle}
        </p>
        <button
          type="button"
          onClick={openBackendDocs}
          disabled={backendOnline !== true}
          title={backendOnline ? "Open backend API docs" : "Backend is offline"}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0b1020]/70 px-3 py-1.5 text-xs transition hover:border-cyan-300/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-slate-200"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline === null
                ? "bg-slate-400"
                : backendOnline
                ? "bg-emerald-400"
                : "bg-rose-400"
            }`}
          />
          <span className="text-slate-200">
            {backendOnline === null
              ? "Checking backend..."
              : backendOnline
              ? "Backend connected (open docs)"
              : "Backend offline"}
          </span>
        </button>

        <form className="mt-8 grid gap-5" onSubmit={onSubmit}>
          {isSignupMode ? (
            <FormInput
              label={t.signup.companyNameLabel}
              name="companyName"
              value={form.companyName}
              onChange={onChange}
              placeholder={t.signup.companyNamePlaceholder}
              required
            />
          ) : null}
          <FormInput
            label={isSignupMode ? t.signup.emailLabel : t.login.emailLabel}
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder={isSignupMode ? t.signup.emailPlaceholder : t.login.emailPlaceholder}
            required
          />
          <FormInput
            label={isSignupMode ? t.signup.passwordLabel : t.login.passwordLabel}
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            placeholder={isSignupMode ? t.signup.passwordPlaceholder : t.login.passwordPlaceholder}
            required
          />
          {isSignupMode ? (
            <>
              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={onChange}
                placeholder="Repeat your password"
                required
              />
              <p className="text-xs text-slate-300">
                Password strength: <span className="font-semibold">{passwordStrength.label}</span>
              </p>
            </>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="button-pop mt-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            {isSubmitting
              ? isSignupMode
                ? "Creating account..."
                : "Logging in..."
              : isSignupMode
              ? t.signup.submit
              : t.login.submit}
          </button>

          {errorMessage ? (
            <p className="rounded-lg border border-rose-300/40 bg-rose-300/10 px-3 py-2 text-sm text-rose-200">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-200">
              {successMessage}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
