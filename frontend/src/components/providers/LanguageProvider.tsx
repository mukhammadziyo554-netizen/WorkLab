"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLanguage,
  Language,
  translations,
  type AppTranslations,
} from "../../translations";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: AppTranslations;
};

const ACTIVE_STORAGE_KEY = "language";
const LEGACY_STORAGE_KEY = "worklab-language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  useEffect(() => {
    const stored =
      window.localStorage.getItem(ACTIVE_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored === "en" || stored === "ru" || stored === "uz") {
      setLanguage(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_STORAGE_KEY, language);
    window.localStorage.setItem(LEGACY_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
