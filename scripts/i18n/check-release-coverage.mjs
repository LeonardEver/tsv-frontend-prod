/** Release gate: real content coverage, not just the number of UI keys. */
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const languages = ["pt-BR", "es", "fr", "de", "it"];
const errors = [];
const stable = (value) => Array.isArray(value) ? "[" + value.map(stable).join(",") + "]" : value && typeof value === "object" ? "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}" : JSON.stringify(value);
const hash = (value) => createHash("sha256").update(stable(value)).digest("hex");
const placeholders = (text) => [...text.matchAll(/\{\{[^}]+\}\}/g)].map((match) => match[0]).sort().join("|");
const immutable = /^(?:.*_id|type|question_type|difficulty|label|lo_label|lo_global_id|correct_answer|source_url|license|redistribution)$/;
function tokens(text) {
  return [...text.matchAll(/\[\[[^\]]+\]\]|\{\{[^}]+\}\}|https?:\/\/[^\s)\]>]+|\]\([^)]*\)|`[^`]*`|\b\d+(?:[.,]\d+)?\b/g)].map((match) => match[0]).sort().join("|");
}
function compare(original, target, path) {
  if (Array.isArray(original)) {
    if (!Array.isArray(target) || original.length !== target.length) { errors.push(path + ": array structure changed"); return; }
    original.forEach((value, index) => compare(value, target[index], path + "." + index));
  } else if (original && typeof original === "object") {
    if (!target || typeof target !== "object" || Object.keys(original).sort().join("|") !== Object.keys(target).sort().join("|")) { errors.push(path + ": fields changed"); return; }
    for (const key of Object.keys(original)) {
      if (immutable.test(key)) { if (stable(original[key]) !== stable(target[key])) errors.push(path + "." + key + ": identity/semantics changed"); }
      else compare(original[key], target[key], path + "." + key);
    }
  } else if (typeof original === "string") {
    if (typeof target !== "string" || (original.trim() && !target.trim())) errors.push(path + ": text missing");
    else if (tokens(original) !== tokens(target)) errors.push(path + ": protected text changed");
  } else if (original !== target) errors.push(path + ": value changed");
}
const sourceFile = JSON.parse(await readFile("docs/i18n/content/source.json", "utf8"));
const sources = new Map(sourceFile.sources.map((source) => [source.entity_type + ":" + source.entity_id, source]));
const namespaces = (await readdir("src/i18n/locales/en")).filter((file) => file.endsWith(".json"));
for (const locale of languages) {
  for (const namespace of namespaces) {
    const en = JSON.parse(await readFile("src/i18n/locales/en/" + namespace, "utf8"));
    const target = JSON.parse(await readFile(`src/i18n/locales/${locale}/${namespace}`, "utf8"));
    if (Object.keys(en).sort().join("|") !== Object.keys(target).sort().join("|")) errors.push(locale + "/" + namespace + ": catalog key coverage");
    for (const [key, text] of Object.entries(en)) if (!target[key]?.trim() || placeholders(text) !== placeholders(target[key])) errors.push(locale + "/" + namespace + ":" + key + ": missing copy/placeholders");
  }
  const pack = JSON.parse(await readFile(`docs/i18n/content/${locale}.json`, "utf8"));
  const seen = new Set();
  for (const record of pack.records) {
    const key = record.entity_type + ":" + record.entity_id;
    const location = locale + "/" + key;
    const source = sources.get(key);
    if (seen.has(key)) errors.push(location + ": duplicate");
    seen.add(key);
    if (!source || record.source_hash !== hash(record.source_fields) || source.source_hash !== record.source_hash || record.source_version !== source.source_version) { errors.push(location + ": stale source"); continue; }
    compare(source.source_fields, record.localized_fields, location);
    const instructional = ["lesson", "quiz", "explanation"].includes(record.entity_type);
    const reviewed = record.status === "published" && record.reviewed_by?.trim() && record.reviewed_at;
    const machine = record.status === "machine_translated" && instructional && record.safety_critical && !record.reviewed_by && !record.reviewed_at;
    if (!reviewed && !machine && !(record.status === "translated" && !instructional && !record.safety_critical)) errors.push(location + ": translation cannot be served");
    if (instructional && hash(record.localized_fields) === source.source_hash) errors.push(location + ": copied English instruction");
    if (record.entity_type === "lesson") {
      source.source_fields.sections.forEach((section, index) => {
        for (const [objectiveIndex, objective] of (section.items ?? []).entries()) {
          if (objective.description.length > 35 && objective.description === record.localized_fields.sections[index]?.items?.[objectiveIndex]?.description) errors.push(location + ": English objective " + objective.lo_label);
        }
        if (!/references|sources|further_reading/.test(section.type) && !/^(?:references|sources|further reading)\b/i.test(section.heading) && section.content.length > 120 && section.content === record.localized_fields.sections[index]?.content && /[a-zA-Z]{3}\s+[a-zA-Z]{3}/.test(section.content)) errors.push(location + ": English section " + index);
      });
    }
  }
  for (const key of sources.keys()) if (!seen.has(key)) errors.push(locale + "/" + key + ": missing translation");
  console.log(`${locale}: ${seen.size}/${sources.size} canonical records checked`);
}
if (errors.length) throw new Error("Language release gate failed:\n" + errors.join("\n"));
console.log("All website locales complete; PDF artifact bytes remain English. Human instructional review is tracked separately.");
