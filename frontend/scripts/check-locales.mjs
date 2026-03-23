import fs from "fs";

const BASE = new URL("../src/locales/", import.meta.url);
const en = JSON.parse(fs.readFileSync(new URL("en.json", BASE), "utf8"));
const ru = JSON.parse(fs.readFileSync(new URL("ru.json", BASE), "utf8"));
const uz = JSON.parse(fs.readFileSync(new URL("uz.json", BASE), "utf8"));

function flatten(obj, prefix = "") {
  const out = [];
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...flatten(v, `${prefix}[${i}]`)));
    return out;
  }
  if (obj && typeof obj === "object") {
    Object.keys(obj).forEach((k) => {
      const p = prefix ? `${prefix}.${k}` : k;
      out.push(...flatten(obj[k], p));
    });
    return out;
  }
  out.push(prefix);
  return out;
}

function missing(master, candidate) {
  const m = new Set(flatten(master));
  const c = new Set(flatten(candidate));
  return [...m].filter((k) => !c.has(k));
}

const enKeys = flatten(en);
const ruMissing = missing(en, ru);
const uzMissing = missing(en, uz);

console.log(`en=${enKeys.length} ru=${flatten(ru).length} uz=${flatten(uz).length}`);
console.log(`ruMissing=${ruMissing.length} uzMissing=${uzMissing.length}`);
if (ruMissing.length) console.log(`ruMissingSample=${ruMissing.slice(0, 20).join(",")}`);
if (uzMissing.length) console.log(`uzMissingSample=${uzMissing.slice(0, 20).join(",")}`);
