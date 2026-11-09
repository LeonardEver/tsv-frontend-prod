/** Offline content authoring only. Never imported by the application or its runtime bundle. */
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = "docs/i18n/content";
const sourcePack = JSON.parse(await readFile(`${root}/source.json`, "utf8"));
const locales = ["pt-BR", "es", "fr", "de", "it"];
const modules = new Map();
for (const line of (await readFile(`${root}/module-titles.txt`, "utf8")).split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [id, ...translations] = line.split("|");
  if (translations.length !== 5) throw new Error("Five module titles required: " + id);
  modules.set(id, translations);
}
const categories = {
  agriculture: ["Agricultura", "Agricultura", "Agriculture", "Landwirtschaft", "Agricoltura"],
  fire: ["Fogo", "Fuego", "Feu", "Feuer", "Fuoco"], food: ["Alimentos", "Alimentos", "Alimentation", "Nahrung", "Cibo"],
  "foraging-plants": ["Coleta e plantas", "Recolección y plantas", "Cueillette et plantes", "Sammeln und Pflanzen", "Raccolta e piante"],
  "medical-first-aid": ["Saúde e primeiros socorros", "Medicina y primeros auxilios", "Médecine et premiers secours", "Medizin und Erste Hilfe", "Medicina e primo soccorso"],
  navigation: ["Navegação", "Orientación", "Orientation", "Orientierung", "Orientamento"], shelter: ["Abrigo", "Refugio", "Abri", "Schutz", "Riparo"],
  "survival-fundamentals": ["Fundamentos de sobrevivência", "Fundamentos de supervivencia", "Fondamentaux de la survie", "Überlebensgrundlagen", "Fondamenti di sopravvivenza"],
  water: ["Água", "Agua", "Eau", "Wasser", "Acqua"],
};
const moduleSources = sourcePack.sources.filter((item) => item.entity_type === "module");
const moduleByTitle = [...moduleSources].sort((a, b) => b.source_fields.title.length - a.source_fields.title.length);
let descriptions = {};
try { descriptions = JSON.parse(await readFile(`${root}/module-descriptions.json`, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
try {
  for (const file of await readdir(`${root}/descriptions`)) if (file.endsWith(".json")) Object.assign(descriptions, JSON.parse(await readFile(`${root}/descriptions/${file}`, "utf8")));
} catch (error) { if (error.code !== "ENOENT") throw error; }
let suffixes = {};
try { suffixes = JSON.parse(await readFile(`${root}/resource-suffixes.json`, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const quizLabels = ["Quiz", "Cuestionario", "Quiz", "Quiz", "Quiz"];
const overrides = JSON.parse(await readFile(`${root}/title-overrides.json`, "utf8"));
let achievementCopy = {};
try { achievementCopy = JSON.parse(await readFile(`${root}/achievement-copy.json`, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const reports = {};
for (const [index, locale] of locales.entries()) {
  const records = [];
  const add = (src, fields, safety = false) => records.push({ ...src, localized_fields: fields, status: safety ? "draft" : "translated", safety_critical: safety, reviewed_by: null, reviewed_at: null });
  for (const src of sourcePack.sources) {
    const moduleId = src.entity_id.replace(/-[KLQR]\d{2}$/, "");
    const name = modules.get(moduleId)?.[index];
    if (overrides[src.entity_type + ":" + src.entity_id]) add(src, { title: overrides[src.entity_type + ":" + src.entity_id][index] });
    else if (src.entity_type === "achievement" && achievementCopy[src.entity_id]) add(src, { title: achievementCopy[src.entity_id].title[index], description: achievementCopy[src.entity_id].description[index] });
    else if (src.entity_type === "category" && categories[src.entity_id]) add(src, { title: categories[src.entity_id][index] });
    else if (["module", "lesson_title", "knowledge"].includes(src.entity_type) && name) {
      const canonical = moduleSources.find((item) => item.entity_id === moduleId);
      // Exact matching avoids quietly substituting a different title for a resource or lesson.
      if (canonical?.source_fields.title === src.source_fields.title) add(src, { title: name });
    } else if (src.entity_type === "quiz_title" && name) {
      const canonical = moduleSources.find((item) => item.entity_id === moduleId);
      if (src.source_fields.title === canonical?.source_fields.title + " Quiz") add(src, { title: `${quizLabels[index]} — ${name}` });
    } else if (src.entity_type === "module_description" && descriptions[moduleId]?.[index]) add(src, { description: descriptions[moduleId][index] });
    else if (src.entity_type === "resource") {
      const parent = moduleByTitle.find((item) => src.source_fields.title.startsWith(item.source_fields.title + " — "));
      if (parent) {
        const suffix = src.source_fields.title.slice(parent.source_fields.title.length + 3);
        const descriptor = suffixes[suffix]?.[index];
        const translatedTitle = modules.get(parent.entity_id)?.[index];
        if (descriptor && translatedTitle) add(src, { title: `${translatedTitle} — ${descriptor}` });
      }
    }
  }
  // Full, authored instructional drafts are structurally expanded without changing any IDs.
  let drafts = [];
  try { drafts = (await readdir(`${root}/drafts/${locale}`)).filter((file) => file.endsWith(".json")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const file of drafts) {
    const draft = JSON.parse(await readFile(`${root}/drafts/${locale}/${file}`, "utf8"));
    const src = sourcePack.sources.find((item) => item.entity_type === draft.entity_type && item.entity_id === draft.entity_id);
    if (!src) throw new Error("Draft source not found: " + file);
    const fields = structuredClone(src.source_fields);
    fields.title = draft.title;
    if (draft.entity_type === "lesson") {
      if (fields.sections.length !== draft.sections.length + 1) throw new Error("Full lesson required: " + file);
      const objectives = fields.sections[0];
      objectives.heading = draft.objectives_heading;
      if (objectives.items.length !== draft.objectives.length) throw new Error("All learning objectives required");
      objectives.items.forEach((item, i) => { item.description = draft.objectives[i]; });
      objectives.content = draft.objectives_intro + "\n\n" + objectives.items.map((item) => `- ${item.lo_label}: ${item.description}`).join("\n") + "\n\n---";
      draft.sections.forEach((section, i) => { fields.sections[i + 1].heading = section.heading; fields.sections[i + 1].content = section.content; });
    } else if (draft.entity_type === "quiz") {
      if (fields.questions.length !== draft.questions.length) throw new Error("Full quiz required");
      draft.questions.forEach((question, i) => {
        const target = fields.questions[i]; target.question_text = question.text;
        if (target.options.length !== question.options.length) throw new Error("All answer choices required");
        question.options.forEach((text, option) => { target.options[option].text = text; });
        const explanation = sourcePack.sources.find((item) => item.entity_type === "explanation" && item.entity_id === `${src.entity_id}/${target.question_id}`);
        if (explanation && question.explanation) add(explanation, { explanation: question.explanation }, true);
      });
    }
    add(src, fields, true);
  }
  // Complete offline translations supersede pilots, with a distinct unverified
  // status. Source hashes and all safety invariants are rechecked by the CLI.
  const complete = JSON.parse(await readFile(`${root}/instructional/${locale}.json`, "utf8"));
  for (const item of complete.records) {
    const src = sourcePack.sources.find((source) => source.entity_type === item.entity_type && source.entity_id === item.entity_id);
    if (!src || src.source_hash !== item.source_hash) throw new Error("Stale instructional translation: " + item.entity_id);
    const existing = records.findIndex((record) => record.entity_type === item.entity_type && record.entity_id === item.entity_id);
    if (existing !== -1) records.splice(existing, 1);
    records.push({ ...src, localized_fields: item.localized_fields, status: "machine_translated", safety_critical: true, reviewed_by: null, reviewed_at: null });
  }
  if (records.length !== sourcePack.sources.length) throw new Error("Incomplete locale pack: " + locale);
  await writeFile(`${root}/${locale}.json`, JSON.stringify({ schema_version: 1, locale, records }, null, 2) + "\n");
  const domains = {};
  for (const src of sourcePack.sources) {
    const domain = domains[src.entity_type] ??= { total: 0, authored: 0, machine_translated: 0, draft: 0, reviewed: 0, missing: 0 };
    domain.total++;
    const record = records.find((item) => item.entity_type === src.entity_type && item.entity_id === src.entity_id);
    if (!record) domain.missing++; else if (record.status === "translated") domain.authored++; else if (record.status === "machine_translated") domain.machine_translated++; else domain.draft++;
  }
  reports[locale] = domains;
  console.log(`${locale}: ${records.length} localized records; machine-authored instruction remains pending human review`);
}
const canonicalDomains = {};
for (const item of sourcePack.sources) canonicalDomains[item.entity_type] = (canonicalDomains[item.entity_type] ?? 0) + 1;
await writeFile(`${root}/coverage.json`, JSON.stringify({ source_sha256: createHash("sha256").update(await readFile(`${root}/source.json`)).digest("hex"), canonical: { locale: "en", domains: canonicalDomains }, locales: reports }, null, 2) + "\n");
