"use client";

import LanguageSwitcher from "./LanguageSwitcher";

type DashboardTopBarProps = {
  searchPlaceholder?: string;
};

export default function DashboardTopBar({
  searchPlaceholder = "Search AI employees, conversations, knowledge base",
}: DashboardTopBarProps) {
  return (
    <header className="sticky top-0 z-20 hidden border-b border-white/10 bg-[rgba(7,11,22,0.9)] px-5 py-3 backdrop-blur-xl md:block lg:px-8">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20L16.6 16.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            readOnly
            value=""
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-xl border border-white/15 bg-[#0f1830]/80 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15"
          />
        </div>

        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:border-cyan-300/45 hover:text-cyan-100"
          aria-label="Notifications"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3.5a4.5 4.5 0 00-4.5 4.5v2.2c0 .8-.25 1.59-.7 2.25L5.5 14.5h13l-1.3-2.05a4.2 4.2 0 01-.7-2.25V8A4.5 4.5 0 0012 3.5z" stroke="currentColor" strokeWidth="1.7" />
            <path d="M9.8 18.3a2.5 2.5 0 004.4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-bold text-slate-900">
            3
          </span>
        </button>

        <LanguageSwitcher className="inline-flex" />

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-left transition hover:border-cyan-300/40"
          aria-label="Admin profile"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-400 text-xs font-bold text-slate-950">
            AD
          </span>
          <span className="hidden text-xs text-slate-200 lg:block">
            <span className="block font-semibold text-white">Admin</span>
            <span className="text-[11px] text-slate-400">Control Center</span>
          </span>
        </button>
      </div>
    </header>
  );
}
