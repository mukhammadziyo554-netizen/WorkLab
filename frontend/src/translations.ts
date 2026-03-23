import en from "./locales/en.json";
import ru from "./locales/ru.json";
import uz from "./locales/uz.json";

export type Language = "en" | "ru" | "uz";
export type AppTranslations = typeof en;

export const defaultLanguage: Language = "en";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (Array.isArray(base)) {
    return Array.isArray(override) && override.length > 0 ? override : base;
  }

  if (isPlainObject(base)) {
    const result: Record<string, unknown> = { ...base };
    const overrideObj = isPlainObject(override) ? override : {};

    Object.keys(base).forEach((key) => {
      result[key] = deepMerge(base[key], overrideObj[key]);
    });

    Object.keys(overrideObj).forEach((key) => {
      if (!(key in result)) {
        result[key] = overrideObj[key];
      }
    });

    return result;
  }

  return override ?? base;
}

function withEnglishFallback(locale: unknown): AppTranslations {
  return deepMerge(en, locale) as AppTranslations;
}

export const translations: Record<Language, AppTranslations> = {
  en: withEnglishFallback(en),
  ru: withEnglishFallback(ru),
  uz: withEnglishFallback(uz),
};
