/** Offline authored translations. Missing strings deliberately remain English fallback. */
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
const root = "src/i18n/locales";
const locales = ["pt-BR", "es", "fr", "de", "it"];
const translations = new Map();
const keyed = new Map();
const adminTranslations = new Map();
for (const file of await readdir("scripts/i18n/copy")) {
  if (file.endsWith(".admin")) {
    for (const line of (await readFile(path.join("scripts/i18n/copy", file), "utf8")).split(/\r?\n/)) {
      if (!line.trim() || line.startsWith("#")) continue;
      const cells = line.split("|");
      if (cells.length !== 5 || cells.some((cell) => !cell.trim())) throw new Error(`${file}: source + ES/FR/DE/IT translations required`);
      adminTranslations.set(cells[0], cells.slice(1));
    }
    continue;
  }
  if (file.endsWith(".json")) {
    const entries = JSON.parse(await readFile(path.join("scripts/i18n/copy", file), "utf8"));
    for (const [key, values] of Object.entries(entries)) {
      if (!Array.isArray(values) || values.length !== 5 || values.some((value) => typeof value !== "string" || !value.trim())) throw new Error(`${file}: five authored translations required for ${key}`);
      keyed.set(key, values);
    }
    continue;
  }
  if (!file.endsWith(".txt")) continue;
  for (const line of (await readFile(path.join("scripts/i18n/copy", file), "utf8")).split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const cells = line.split("|");
    if (cells.length !== 6 || cells.some((cell) => !cell.trim())) throw new Error(`${file}: expected source + five translations: ${line}`);
    if (translations.has(cells[0]) && JSON.stringify(translations.get(cells[0])) !== JSON.stringify(cells.slice(1))) throw new Error(`Conflicting copy: ${cells[0]}`);
    translations.set(cells[0], cells.slice(1));
  }
}
const namespaces = (await readdir(path.join(root, "en"))).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5));
const coverage = { en: {} };
for (const namespace of namespaces) {
  const source = JSON.parse(await readFile(path.join(root, "en", namespace + ".json"), "utf8"));
  coverage.en[namespace] = { translated: Object.keys(source).length, source: Object.keys(source).length, missing: [] };
}
for (const [index, locale] of locales.entries()) {
  coverage[locale] = {};
  for (const namespace of namespaces) {
    const source = JSON.parse(await readFile(path.join(root, "en", namespace + ".json"), "utf8"));
    let target = {};
    try { target = JSON.parse(await readFile(path.join(root, locale, namespace + ".json"), "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
    for (const [key, text] of Object.entries(source)) {
      const authored = keyed.get(namespace + ":" + key)?.[index]
        ?? (namespace === "admin" && index > 0 ? adminTranslations.get(text)?.[index - 1] : undefined)
        ?? translations.get(text)?.[index];
      if (authored) target[key] = authored;
      const tokens = (value) => [...value.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1]).sort().join(",");
      if (target[key] && tokens(text) !== tokens(target[key])) throw new Error(`Placeholder mismatch ${locale}/${namespace}:${key}`);
    }
    for (const key of Object.keys(target)) if (!(key in source)) delete target[key];
    await writeFile(path.join(root, locale, namespace + ".json"), JSON.stringify(target, null, 2) + "\n");
    coverage[locale][namespace] = { translated: Object.keys(target).length, source: Object.keys(source).length, missing: Object.keys(source).filter((key) => !(key in target)) };
  }
  await writeFile(path.join(root, locale, "index.ts"), namespaces.map((ns) => `import ns_${ns} from "./${ns}.json";`).join("\n") + "\nexport default { " + namespaces.map((ns) => `${ns}: ns_${ns}`).join(", ") + " };\n");
}
await writeFile("docs/i18n/ui-coverage.json", JSON.stringify(coverage, null, 2) + "\n");
for (const [locale, domains] of Object.entries(coverage)) console.log(locale, Object.values(domains).reduce((sum, domain) => sum + domain.translated, 0), "/", Object.values(domains).reduce((sum, domain) => sum + domain.source, 0));
