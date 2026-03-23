import fs from "fs";

const BASE = new URL("../src/locales/", import.meta.url);
const enPath = new URL("en.json", BASE);
const ruPath = new URL("ru.json", BASE);
const uzPath = new URL("uz.json", BASE);

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const ruCurrent = JSON.parse(fs.readFileSync(ruPath, "utf8"));
const uzCurrent = JSON.parse(fs.readFileSync(uzPath, "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const translationCache = new Map();

function maskPlaceholders(text) {
  const tokens = [];
  const masked = text.replace(/\{[^}]+\}|%\{[^}]+\}|\$\{[^}]+\}|%s|%d/g, (m) => {
    const id = `__PH_${tokens.length}__`;
    tokens.push(m);
    return id;
  });
  return { masked, tokens };
}

function unmaskPlaceholders(text, tokens) {
  let out = text;
  tokens.forEach((tok, i) => {
    out = out.replaceAll(`__PH_${i}__`, tok);
  });
  return out;
}

function normalizeTerms(text, lang) {
  if (lang === "ru") {
    return text
      .replace(/ИИ\s+сотрудник/gi, "AI сотрудник")
      .replace(/сотрудник\s+ИИ/gi, "AI сотрудник")
      .replace(/база\s+знаний/gi, "База знаний")
      .replace(/диалоги/gi, "Диалоги")
      .replace(/аналитика/gi, "Аналитика")
      .replace(/настройки/gi, "Настройки");
  }
  if (lang === "uz") {
    return text
      .replace(/sun['’]?iy intellekt\s+xodim(i|i)?/gi, "AI xodim")
      .replace(/si\s+xodim(i|i)?/gi, "AI xodim")
      .replace(/bilim(lar)?\s+bazasi/gi, "Bilimlar bazasi")
      .replace(/suhbatlar/gi, "Suhbatlar")
      .replace(/analitika/gi, "Analitika")
      .replace(/sozlamalar/gi, "Sozlamalar");
  }
  return text;
}

async function translateText(source, targetLang) {
  if (!source || !source.trim()) return source;
  const cacheKey = `${targetLang}::${source}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const { masked, tokens } = maskPlaceholders(source);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(masked)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      translationCache.set(cacheKey, source);
      return source;
    }

    const data = await res.json();
    const translated = (data?.[0] || []).map((x) => x[0]).join("");
    const restored = unmaskPlaceholders(translated || source, tokens);
    const normalized = normalizeTerms(restored, targetLang);
    translationCache.set(cacheKey, normalized);
    return normalized;
  } catch {
    translationCache.set(cacheKey, source);
    return source;
  }
}

function flattenKeys(obj, prefix = "") {
  const out = [];
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...flattenKeys(v, `${prefix}[${i}]`)));
    return out;
  }
  if (obj && typeof obj === "object") {
    Object.keys(obj).forEach((k) => {
      const p = prefix ? `${prefix}.${k}` : k;
      out.push(...flattenKeys(obj[k], p));
    });
    return out;
  }
  out.push(prefix);
  return out;
}

let translatedCountRU = 0;
let translatedCountUZ = 0;

async function syncLocale(master, current, lang) {
  if (Array.isArray(master)) {
    const arr = [];
    for (let i = 0; i < master.length; i += 1) {
      const curVal = Array.isArray(current) ? current[i] : undefined;
      arr.push(await syncLocale(master[i], curVal, lang));
    }
    return arr;
  }

  if (master && typeof master === "object") {
    const obj = {};
    for (const key of Object.keys(master)) {
      const curVal = current && typeof current === "object" ? current[key] : undefined;
      obj[key] = await syncLocale(master[key], curVal, lang);
    }
    return obj;
  }

  if (typeof master === "string") {
    if (typeof current === "string" && current.trim().length > 0) {
      return current;
    }
    const out = await translateText(master, lang);
    if (lang === "ru") translatedCountRU += 1;
    if (lang === "uz") translatedCountUZ += 1;
    await sleep(5);
    return out;
  }

  return current !== undefined ? current : master;
}

const ruNext = await syncLocale(en, ruCurrent, "ru");
const uzNext = await syncLocale(en, uzCurrent, "uz");

fs.writeFileSync(ruPath, `${JSON.stringify(ruNext, null, 2)}\n`);
fs.writeFileSync(uzPath, `${JSON.stringify(uzNext, null, 2)}\n`);

console.log(`translated_missing ru=${translatedCountRU} uz=${translatedCountUZ}`);
console.log(
  `counts en=${flattenKeys(en).length} ru=${flattenKeys(ruNext).length} uz=${flattenKeys(uzNext).length}`
);
