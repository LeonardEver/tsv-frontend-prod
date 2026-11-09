/** Ingest completed offline packs as the repeatable authoring source.
 * Internal references remain byte-for-byte identical to canonical English. */
import { readFile, writeFile } from "node:fs/promises";
const root = "docs/i18n/content";
const locales = ["pt-BR", "es", "fr", "de", "it"];
const { sources } = JSON.parse(await readFile(`${root}/source.json`, "utf8"));
const canonical = new Map(sources.map((record) => [record.entity_type + ":" + record.entity_id, record]));
const wiki = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

function preserveReferences(original, translated, path) {
  if (typeof original === "string") {
    if (typeof translated !== "string") throw new Error(path + ": missing text");
    const queues = new Map();
    for (const match of original.matchAll(wiki)) {
      if (!queues.has(match[1])) queues.set(match[1], []);
      queues.get(match[1]).push(match[0]);
    }
    const text = translated.replace(wiki, (_match, target) => {
      const reference = queues.get(target)?.shift();
      if (!reference) throw new Error(path + ": unexpected internal reference");
      return reference;
    });
    if ([...queues.values()].some((queue) => queue.length)) throw new Error(path + ": omitted internal reference");
    return text;
  }
  if (Array.isArray(original)) {
    if (!Array.isArray(translated) || original.length !== translated.length) throw new Error(path + ": array changed");
    return original.map((value, index) => preserveReferences(value, translated[index], path + "." + index));
  }
  if (original && typeof original === "object") {
    if (!translated || typeof translated !== "object" || Object.keys(original).sort().join("|") !== Object.keys(translated).sort().join("|")) throw new Error(path + ": fields changed");
    return Object.fromEntries(Object.entries(original).map(([key, value]) => [key, preserveReferences(value, translated[key], path + "." + key)]));
  }
  if (original !== translated) throw new Error(path + ": non-text value changed");
  return translated;
}

for (const locale of locales) {
  const pack = JSON.parse(await readFile(`${root}/${locale}.json`, "utf8"));
  const provenance = JSON.parse(await readFile(`${root}/instructional/provenance-${locale}.json`, "utf8"));
  const records = [];
  for (const record of pack.records) {
    const source = canonical.get(record.entity_type + ":" + record.entity_id);
    if (!source || source.source_hash !== record.source_hash || source.source_version !== record.source_version) throw new Error("Stale completed pack: " + record.entity_id);
    record.localized_fields = preserveReferences(source.source_fields, record.localized_fields, locale + "/" + record.entity_id);
    if (["lesson", "quiz", "explanation"].includes(record.entity_type)) records.push({ entity_type: record.entity_type, entity_id: record.entity_id, source_hash: record.source_hash, localized_fields: record.localized_fields });
  }
  if (records.length !== 941) throw new Error("Incomplete instructional delivery: " + locale);
  await writeFile(`${root}/instructional/${locale}.json`, JSON.stringify({ locale, method: provenance.method, human_reviewed: false, provenance, records }, null, 2) + "\n");
  await writeFile(`${root}/${locale}.json`, JSON.stringify(pack, null, 2) + "\n");
  console.log(`${locale}: ${records.length} completed instructional records synchronized; internal references preserved`);
}
