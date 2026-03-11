"use client";

import { useEffect, useRef, useState } from "react";
import { Language } from "../../translations";
import { useLanguage } from "../providers/LanguageProvider";

const languageOptions: Array<{ code: Language; shortLabel: string; label: string }> = [
  { code: "en", shortLabel: "EN", label: "English" },
  { code: "ru", shortLabel: "RU", label: "Русский" },
  { code: "uz", shortLabel: "UZ", label: "O'zbek" },
];

type LanguageSwitcherProps = {
  className?: string;
};

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, []);

  const activeLanguage = languageOptions.find((option) => option.code === language) || languageOptions[0];

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${className}`}
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-[#0e1426]/85 px-3 text-xs font-semibold tracking-[0.08em] text-slate-100 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_24px_rgba(8,15,35,0.35)] transition hover:border-cyan-300/45 hover:text-cyan-100"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {activeLanguage.shortLabel}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : "rotate-0"}`}
          aria-hidden="true"
        >
          <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.45rem)] z-30 w-40 origin-top-right rounded-xl border border-white/15 bg-[#0d1324]/95 p-1.5 backdrop-blur-xl transition duration-150 ${
          isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        role="listbox"
      >
        {languageOptions.map((option) => {
          const isActive = language === option.code;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                setLanguage(option.code);
                setIsOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                isActive
                  ? "bg-cyan-300/20 text-cyan-100"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
              role="option"
              aria-selected={isActive}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
