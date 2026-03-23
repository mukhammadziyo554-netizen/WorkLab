"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../components/providers/LanguageProvider";
import LanguageSwitcher from "../components/ui/LanguageSwitcher";
import MobileTelegramPublicNav from "../components/ui/MobileTelegramPublicNav";
import { getApiHeaders, getBackendBaseUrl } from "../lib/backend";

type DemoScenarioKey = "ecommerce" | "technical" | "tracking" | "refund";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demoStage, setDemoStage] = useState<"idle" | "customer" | "typing" | "ai">("idle");
  const [animationPlayed, setAnimationPlayed] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenarioKey>("tracking");
  const animationStartedRef = useRef(false);
  const demoTimerIdsRef = useRef<number[]>([]);
  const { t } = useLanguage();
  const demoScenarios = t.landing.demoScenarios;

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
  }, [selectedScenario]);

  useEffect(() => {
    const clearDemoTimers = () => {
      demoTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
      demoTimerIdsRef.current = [];
    };

    const schedule = (delay: number, nextStage: "idle" | "customer" | "typing" | "ai") => {
      const id = window.setTimeout(() => {
        setDemoStage(nextStage);
      }, delay);
      demoTimerIdsRef.current.push(id);
    };

    const runOnce = () => {
      if (animationStartedRef.current) {
        return;
      }

      animationStartedRef.current = true;
      setAnimationPlayed(false);
      setDemoStage("idle");

      schedule(250, "customer");
      schedule(1150, "typing");
      schedule(2150, "ai");

      const completeId = window.setTimeout(() => {
        setDemoStage("ai");
        setAnimationPlayed(true);
      }, 2550);
      demoTimerIdsRef.current.push(completeId);
    };

    runOnce();

    return () => {
      clearDemoTimers();
    };
  }, []);

  const replayDemo = () => {
    demoTimerIdsRef.current.forEach((id) => window.clearTimeout(id));
    demoTimerIdsRef.current = [];
    animationStartedRef.current = false;

    setAnimationPlayed(false);
    setDemoStage("idle");

    const schedule = (delay: number, nextStage: "idle" | "customer" | "typing" | "ai") => {
      const id = window.setTimeout(() => {
        setDemoStage(nextStage);
      }, delay);
      demoTimerIdsRef.current.push(id);
    };

    animationStartedRef.current = true;
    schedule(250, "customer");
    schedule(1150, "typing");
    schedule(2150, "ai");

    const completeId = window.setTimeout(() => {
      setDemoStage("ai");
      setAnimationPlayed(true);
    }, 2550);
    demoTimerIdsRef.current.push(completeId);
  };

  const showCustomer = demoStage === "customer" || demoStage === "typing" || demoStage === "ai" || animationPlayed;
  const showTyping = demoStage === "typing";
  const showAi = demoStage === "ai" || animationPlayed;

  const sectionTitleClass =
    "text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl";
  const sectionTextClass = "mt-4 text-base leading-7 text-slate-300 sm:text-lg";
  const cardClass =
    "group card-premium rounded-2xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";
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
        <div className="hero-gradient-float glow-drift-cyan absolute left-1/2 top-[-20rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="hero-gradient-float glow-drift-purple absolute left-[18%] top-[8rem] h-[22rem] w-[22rem] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="glow-drift-cyan absolute bottom-[-10rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-24 pt-5 sm:px-8 lg:px-10">
        <header className="navbar-premium reveal-up sticky top-4 z-20 rounded-2xl px-4 py-3.5">
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
                    {t.common.profile}
                  </Link>
                </>
              ) : (
                <Link href="/login" className="transition hover:text-white">
                  {t.nav.login}
                </Link>
              )}
              <Link href="/create-employee" className={`${primaryButtonClass} button-glow button-pop px-5 py-2.5`}>
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
            <p data-reveal className="scroll-reveal reveal-up mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1 text-sm text-cyan-200">
              {t.landing.badge}
            </p>
            <p data-reveal className="scroll-reveal reveal-up stagger-1 bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl md:text-8xl lg:text-9xl">
              WorkLab
            </p>
            <h1 data-reveal className="scroll-reveal reveal-up stagger-2 mt-6 text-3xl font-semibold leading-tight text-cyan-100 sm:text-4xl lg:text-5xl">
              {t.landing.heroTitle}
            </h1>
            <p data-reveal className="scroll-reveal reveal-up stagger-3 mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              {t.landing.heroDescription}
            </p>
            <div data-reveal className="scroll-reveal reveal-up stagger-4 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/create-employee" className={`${primaryButtonClass} button-glow button-pop w-full sm:w-auto`}>
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
              <h2 data-reveal className={`${sectionTitleClass} scroll-reveal`}>{t.landing.demoTitle}</h2>
              <p data-reveal className={`${sectionTextClass} scroll-reveal`}>
                {t.landing.demoDescription}
              </p>
            </div>

            <div data-reveal className="scroll-reveal mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#0c1224]/85 p-5 shadow-[0_30px_80px_rgba(6,12,34,0.6)] sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-sm font-medium text-white">{t.landing.chatTitle}</p>
                <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-xs font-semibold text-cyan-200">
                  {t.landing.aiOnline}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(demoScenarios) as DemoScenarioKey[]).map((scenario) => {
                    const isActive = selectedScenario === scenario;
                    return (
                      <button
                        key={scenario}
                        type="button"
                        onClick={() => {
                          setSelectedScenario(scenario);
                        }}
                        className={`button-pop rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                            : "border-white/20 bg-white/5 text-slate-200 hover:border-cyan-300/30"
                        }`}
                      >
                        {demoScenarios[scenario].label}
                      </button>
                    );
                  })}
                </div>

                <div className="min-h-[16rem] space-y-4">
                  <div
                    className={`max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-slate-100 transition-all duration-500 ${
                      showCustomer ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    aria-hidden={!showCustomer}
                  >
                    {demoScenarios[selectedScenario].customer}
                  </div>

                  <div
                    className={`ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 transition-all duration-400 ${
                      showTyping ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    aria-hidden={!showTyping}
                  >
                    <p className="mb-1 text-[11px] text-cyan-100/85">{t.landing.typing}</p>
                    <div className="inline-flex items-center gap-1">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>

                  <div
                    className={`ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-cyan-300/30 bg-cyan-300/12 px-4 py-3 text-sm text-cyan-100 transition-all duration-500 ${
                      showAi ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                    }`}
                    aria-hidden={!showAi}
                  >
                    <p>{demoScenarios[selectedScenario].ai}</p>
                    <div className="mt-3 space-y-1 border-t border-cyan-200/20 pt-2 text-[11px] text-cyan-100/90">
                      <details className="rounded-md border border-cyan-200/20 bg-cyan-200/5 px-2 py-1">
                        <summary className="cursor-pointer select-none">{t.landing.aiConfidence}: {demoScenarios[selectedScenario].confidence}%</summary>
                        <p className="mt-1 text-[10px] text-cyan-100/80">
                          {t.landing.aiSourcePrefix} {demoScenarios[selectedScenario].source}
                        </p>
                      </details>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/create-employee" className={`${primaryButtonClass} button-glow button-pop`}>
                  {t.landing.createYourAiEmployee}
                </Link>
                <button
                  type="button"
                  onClick={replayDemo}
                  className="button-pop inline-flex items-center justify-center rounded-xl border border-white/25 bg-transparent px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:border-cyan-200/60 hover:bg-white/10"
                >
                  {t.landing.replayDemo}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-24 sm:mt-32">
          <div className="mx-auto max-w-5xl text-center">
            <h3 data-reveal className={`${sectionTitleClass} scroll-reveal`}>{t.landing.howItWorksTitle}</h3>
            <p data-reveal className={`${sectionTextClass} scroll-reveal`}>
              {t.landing.howItWorksDescription}
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {t.landing.howItWorksSteps.map((step, index) => (
              <article
                key={step.title}
                data-reveal
                className={`scroll-reveal card-premium ${staggerClasses[index % staggerClasses.length]} group rounded-2xl p-5 text-left`}
              >
                <span className="icon-drift inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 text-xs font-bold tracking-[0.12em] text-cyan-100">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4 className="mt-4 text-base font-semibold text-white">{step.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="mt-24 sm:mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h3 data-reveal className={`${sectionTitleClass} scroll-reveal`}>{t.landing.featuresTitle}</h3>
            <p data-reveal className={`${sectionTextClass} scroll-reveal`}>{t.landing.featuresDescription}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {t.landing.featureCards.map((feature, index) => (
              <article
                key={feature.title}
                data-reveal
                className={`${cardClass} scroll-reveal ${staggerClasses[index % staggerClasses.length]}`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="icon-drift inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-300/12 text-cyan-100">
                    {index + 1}
                  </span>
                  <div className="h-1 w-14 rounded-full bg-gradient-to-r from-cyan-300 to-purple-400" />
                </div>
                <h4 className="text-xl font-semibold text-white">{feature.title}</h4>
                <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="mt-24 sm:mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h3 data-reveal className={`${sectionTitleClass} scroll-reveal`}>{t.landing.pricingTitle}</h3>
            <p data-reveal className={`${sectionTextClass} scroll-reveal`}>{t.landing.pricingDescription}</p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {t.landing.pricingPlans.map((plan, index) => (
              <article
                key={plan.name}
                data-reveal
                className={`scroll-reveal card-premium ${staggerClasses[index % staggerClasses.length]} rounded-2xl p-8 ${hoverGlows[index % hoverGlows.length]} ${
                  index === 1
                    ? "border-cyan-300/70 bg-gradient-to-b from-cyan-300/15 to-purple-500/10"
                    : ""
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
                  } button-glow button-pop`}
                >
                  {plan.chooseLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24 sm:mt-32">
          <div className="mx-auto max-w-2xl text-center">
            <h3 data-reveal className={`${sectionTitleClass} scroll-reveal`}>{t.landing.integrationsTitle}</h3>
            <p data-reveal className={`${sectionTextClass} scroll-reveal`}>
              {t.landing.integrationsDescription}
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {t.landing.integrations.map((integration, index) => (
              <div
                key={integration}
                data-reveal
                className={`scroll-reveal card-premium ${staggerClasses[index % staggerClasses.length]} rounded-2xl p-4 text-center`}
              >
                <p className="text-sm font-semibold text-cyan-100">{integration}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
