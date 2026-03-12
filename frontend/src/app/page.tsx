"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "../components/providers/LanguageProvider";
import LanguageSwitcher from "../components/ui/LanguageSwitcher";
import MobileTelegramPublicNav from "../components/ui/MobileTelegramPublicNav";
import { getApiHeaders, getBackendBaseUrl } from "../lib/backend";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useLanguage();

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

  const sectionTitleClass =
    "text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl";
  const sectionTextClass = "mt-4 text-base leading-7 text-slate-300 sm:text-lg";
  const cardClass =
    "rounded-2xl border border-white/10 bg-slate-900/75 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition duration-200 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-slate-900";
  const primaryButtonClass =
    "inline-flex items-center justify-center rounded-xl bg-cyan-300 px-7 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-xl border border-white/25 bg-transparent px-7 py-3 text-sm font-semibold text-white transition duration-200 hover:border-cyan-200/60 hover:bg-white/10";
  const staggerClasses = ["stagger-1", "stagger-2", "stagger-3", "stagger-4"];

  const hoverGlows = [
    "hover:shadow-[0_18px_50px_rgba(34,211,238,0.12)]",
    "hover:shadow-[0_24px_60px_rgba(168,85,247,0.22)]",
    "hover:shadow-[0_20px_58px_rgba(34,211,238,0.18)]",
  ];

  return (
    <main className="animate-fade-in relative min-h-screen overflow-hidden bg-[#05070f] text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="glow-drift-cyan absolute left-1/2 top-[-20rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="glow-drift-purple absolute left-[18%] top-[8rem] h-[22rem] w-[22rem] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="glow-drift-cyan absolute bottom-[-10rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-28 pt-6 sm:px-10 lg:px-12">
        <header className="reveal-up sticky top-5 z-20 rounded-2xl border border-white/10 bg-[#090d1bcc] px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="hidden text-2xl font-bold tracking-tight text-white md:block">
              WorkLab
            </Link>
            <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
              <a href="#features" className="transition hover:text-cyan-200">
                {t.nav.features}
              </a>
              <a href="#pricing" className="transition hover:text-cyan-200">
                {t.nav.pricing}
              </a>
              <Link href="/ai" className="transition hover:text-cyan-200">
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
                    Profile
                  </Link>
                </>
              ) : (
                <Link href="/login" className="transition hover:text-white">
                  {t.nav.login}
                </Link>
              )}
              <Link href="/create-employee" className={`${primaryButtonClass} button-pop px-5 py-2.5`}>
                {t.nav.createAiEmployee}
              </Link>
              <LanguageSwitcher />
            </nav>
            <div className="md:hidden">
              <MobileTelegramPublicNav isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
            </div>
          </div>
        </header>

        <section className="pt-20 text-center sm:pt-24 lg:pt-28">
          <div className="mx-auto max-w-4xl">
            <p className="reveal-up mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1 text-sm text-cyan-200">
              {t.landing.badge}
            </p>
            <p className="reveal-up stagger-1 text-6xl font-bold tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl">
              WorkLab
            </p>
            <h1 className="reveal-up stagger-2 mt-6 text-3xl font-semibold leading-tight text-cyan-100 sm:text-4xl lg:text-5xl">
              {t.landing.heroTitle}
            </h1>
            <p className="reveal-up stagger-3 mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              {t.landing.heroDescription}
            </p>
            <div className="reveal-up stagger-4 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/create-employee" className={`${primaryButtonClass} button-pop w-full sm:w-auto`}>
                {t.nav.createAiEmployee}
              </Link>
              <a href="#demo" className={`${secondaryButtonClass} button-pop w-full sm:w-auto`}>
                {t.landing.watchDemo}
              </a>
            </div>
          </div>
        </section>

        <section id="demo" className="mt-24 sm:mt-32">
          <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-300/10 via-[#0b1020] to-purple-500/15 p-6 sm:p-10">
            <div className="mb-6 text-center">
              <h2 className={`${sectionTitleClass} reveal-up`}>{t.landing.demoTitle}</h2>
              <p className={`${sectionTextClass} reveal-up`}>{t.landing.demoDescription}</p>
            </div>

            <div className="reveal-up mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#0c1224]/85 p-5 shadow-[0_30px_80px_rgba(6,12,34,0.6)] sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-sm font-medium text-white">{t.landing.chatTitle}</p>
                <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-xs font-semibold text-cyan-200">
                  {t.landing.aiOnline}
                </span>
              </div>

              <div className="space-y-4">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-4 py-3 text-sm text-slate-100">
                  {t.landing.customerMessage}
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
                  {t.landing.aiMessage}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-24 sm:mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className={sectionTitleClass}>{t.landing.featuresTitle}</h3>
            <p className={sectionTextClass}>{t.landing.featuresDescription}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {t.landing.featureCards.map((feature, index) => (
              <article
                key={feature.title}
                className={`${cardClass} reveal-up ${staggerClasses[index % staggerClasses.length]}`}
              >
                <div className="mb-4 h-1 w-14 rounded-full bg-gradient-to-r from-cyan-300 to-purple-400" />
                <h4 className="text-xl font-semibold text-white">{feature.title}</h4>
                <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="mt-24 sm:mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h3 className={sectionTitleClass}>{t.landing.pricingTitle}</h3>
            <p className={sectionTextClass}>{t.landing.pricingDescription}</p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {t.landing.pricingPlans.map((plan, index) => (
              <article
                key={plan.name}
                className={`reveal-up ${staggerClasses[index % staggerClasses.length]} rounded-2xl border p-8 transition hover:-translate-y-1 ${hoverGlows[index % hoverGlows.length]} ${
                  index === 1
                    ? "border-cyan-300/70 bg-gradient-to-b from-cyan-300/15 to-purple-500/10"
                    : "border-white/10 bg-slate-900/75 hover:border-cyan-300/40"
                }`}
              >
                <h4 className="text-xl font-semibold text-white">{plan.name}</h4>
                <p className="mt-4 text-4xl font-bold text-white">
                  {plan.price}
                  <span className="text-base font-medium text-slate-300">{plan.period}</span>
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-300">{plan.description}</p>
                <Link
                  href="/create-employee"
                  className={`mt-8 inline-flex w-full rounded-xl px-5 py-3 text-center text-sm font-semibold transition ${
                    index === 1 ? primaryButtonClass : secondaryButtonClass
                  } button-pop`}
                >
                  {plan.chooseLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
