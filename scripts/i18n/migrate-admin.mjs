/** Consolidate the existing EN/PT analytics dictionary into the global namespace. */
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
const file = "src/features/admin-analytics/dictionary.ts";
const text = await readFile(file, "utf8");
if (!text.includes("const en: Dict")) throw new Error("Admin dictionary already migrated");
const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
const flattened = {};
function flatten(node, prefix = "", output = {}) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) output[prefix] = node.text;
  else if (ts.isObjectLiteralExpression(node)) for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) throw new Error("Unexpected dictionary node");
    const name = ts.isStringLiteral(prop.name) ? prop.name.text : prop.name.getText(source);
    flatten(prop.initializer, prefix ? prefix + "." + name : name, output);
  } else throw new Error("Unexpected dictionary value: " + node.kind);
  return output;
}
function visit(node) {
  if (ts.isVariableDeclaration(node) && ["en", "pt"].includes(node.name.getText(source))) flattened[node.name.getText(source)] = flatten(node.initializer);
  ts.forEachChild(node, visit);
}
visit(source);
for (const [name, locale] of [["en", "en"], ["pt", "pt-BR"]]) await writeFile(`src/i18n/locales/${locale}/admin.json`, JSON.stringify(flattened[name], null, 2) + "\n");
const interfaceStart = text.indexOf("export interface Dict");
const interfaceEnd = text.indexOf("const en: Dict");
const contract = text.slice(interfaceStart, interfaceEnd);
await writeFile(file, `/** Typed compatibility adapter. All analytics copy now uses the application's i18next instance. */
import { i18n } from "@/i18n";
import { normalizeLocale } from "@/i18n/config";
import english from "@/i18n/locales/en/admin.json";
import portuguese from "@/i18n/locales/pt-BR/admin.json";
import type { AdminLanguage } from "./language";
${contract}
i18n.addResourceBundle("pt-BR", "admin", portuguese, true, true);
// Legacy structural contract remains available to existing audit tests.
function tree(entries: Record<string, string>): Dict {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    const parts = key.split("."); let node = result;
    for (const part of parts.slice(0, -1)) { node[part] ??= {}; node = node[part] as Record<string, unknown>; }
    node[parts.at(-1) ?? key] = value;
  }
  return result as unknown as Dict;
}
export const STRINGS = { en: tree(english), pt: tree(portuguese) };
function lookup(language: AdminLanguage, key: string): unknown {
  const locale = language === "pt" ? "pt-BR" : normalizeLocale(language) ?? "en";
  return i18n.getResource(locale, "admin", key) ?? i18n.getResource("en", "admin", key);
}
export function translate(language: AdminLanguage, key: string): string {
  const value = lookup(language, key);
  return typeof value === "string" ? value : key;
}
export function interpolate(language: AdminLanguage, key: string, params: Readonly<Record<string, number | string>>): string {
  const template = lookup(language, key);
  if (typeof template !== "string") throw new Error('admin-analytics i18n: "' + key + '" is not an interpolated string');
  return template.replace(/\\{\\{(\\w+)\\}\\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error('admin-analytics i18n: "' + key + '" is missing the "{{' + name + '}}" value');
    return String(value);
  });
}
`);
// English namespace is eager; the other locale bundles remain lazy.
let index = await readFile("src/i18n/locales/en/index.ts", "utf8");
index = 'import admin from "./admin.json";\n' + index.replace("export default {", "export default { admin,");
await writeFile("src/i18n/locales/en/index.ts", index);
console.log(Object.keys(flattened.en).length + " analytics keys migrated; Portuguese preserved");
