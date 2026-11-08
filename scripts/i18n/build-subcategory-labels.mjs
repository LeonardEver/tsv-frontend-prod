import { readFile, writeFile } from "node:fs/promises";
const english = JSON.parse(await readFile("src/i18n/locales/en/learning.json", "utf8"));
const overrides = {};
const keys = {};
for (const line of (await readFile("scripts/i18n/copy/subcategories.labels", "utf8")).split(/\r?\n/)) {
  if (!line.trim()) continue;
  const [slug, source, ...translations] = line.split("|");
  if (translations.length !== 5 || translations.some(value => !value.trim())) throw new Error("Five labels required: " + slug);
  const key = "subcategory_" + slug.replaceAll("-", "_");
  english[key] = source; overrides["learning:" + key] = translations; keys[slug] = "learning:" + key;
}
await writeFile("src/i18n/locales/en/learning.json", JSON.stringify(english, null, 2) + "\n");
await writeFile("scripts/i18n/copy/subcategories.json", JSON.stringify(overrides, null, 2) + "\n");
await writeFile("src/i18n/subcategories.ts", '/* Generated from authored subcategories.labels. Canonical slugs never change. */\nimport { tr } from "./index";\nconst keys = ' + JSON.stringify(keys, null, 2) + ' as const;\nexport function subcategoryTitle(slug: string): string {\n  if (Object.hasOwn(keys, slug)) return tr(keys[slug as keyof typeof keys]);\n  const words = slug.replaceAll("-", " ");\n  return words.charAt(0).toUpperCase() + words.slice(1);\n}\n');
