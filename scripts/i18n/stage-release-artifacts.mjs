/**
 * Stage the five locale packs as the backend release artifact consumed by
 * backend/src/shared/i18n/release.ts (strict schema + sha256 manifest).
 * Run from frontend/ AFTER `node scripts/i18n/check-release-coverage.mjs` passes:
 *   node scripts/i18n/stage-release-artifacts.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const LOCALES = ["pt-BR", "es", "fr", "de", "it"];
await import("./check-release-coverage.mjs");
const out = process.argv.includes("--staging") ? "tmp/translation-merge-backend/files/migrations/data/content-locales-20261108" : "../backend/migrations/data/content-locales-20261108";
const FIELDS = ["entity_type", "entity_id", "source_version", "source_hash", "source_fields", "localized_fields", "status", "safety_critical", "reviewed_by", "reviewed_at"];
await mkdir(out, { recursive: true });
const sha = (text) => createHash("sha256").update(text).digest("hex");
const { categories: additions } = JSON.parse(await readFile("docs/i18n/content/category-additions.json", "utf8"));
const files = {};
for (const locale of LOCALES) {
  const pack = JSON.parse(await readFile(`docs/i18n/content/${locale}.json`, "utf8"));
  if (pack.locale !== locale) throw new Error(`Locale mismatch in ${locale}.json`);
  const records = pack.records.map((r) => Object.fromEntries(FIELDS.map((k) => [k, r[k] ?? null])));
  const present = new Set(records.map((r) => r.entity_type + ":" + r.entity_id));
  for (const [slug, names] of Object.entries(additions)) {
    if (present.has("category:" + slug)) continue;
    const source_fields = { title: names.en };
    records.push({ entity_type: "category", entity_id: slug, source_version: 1, source_hash: sha(JSON.stringify({ title: names.en })), source_fields, localized_fields: { title: names[locale] }, status: "translated", safety_critical: false, reviewed_by: null, reviewed_at: null });
  }
  const bytes = Buffer.from(JSON.stringify({ schema_version: 1, locale, records }) + "\n", "utf8");
  await writeFile(`${out}/${locale}.json`, bytes);
  files[`${locale}.json`] = createHash("sha256").update(bytes).digest("hex");
  const statuses = records.reduce((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {});
  console.log(locale, records.length, "records", JSON.stringify(statuses), (bytes.length / 1e6).toFixed(1) + " MB");
}
await writeFile(`${out}/manifest.json`, JSON.stringify({ schema_version: 1, files }, null, 2) + "\n");
console.log("manifest.json written →", out);
