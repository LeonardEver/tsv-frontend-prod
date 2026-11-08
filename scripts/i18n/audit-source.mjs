/** Read-only UI source inventory. Never traverses dependencies or test fixtures. */
import ts from "typescript";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const labelFields = new Set(["title", "subtitle", "description", "detail", "label", "hint", "placeholder", "eyebrow", "alt", "aria-label", "aria-description", "emptyTitle", "emptyDescription", "message", "note", "text", "tagline", "body", "confirmationText", "confirmLabel", "cancelLabel"]);
const attributeFields = new Set([...labelFields].filter((field) => field !== "name"));
const entries = [];
async function files(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!["i18n", "test", "types", "assets"].includes(entry.name)) results.push(...await files(file));
    } else if (/\.tsx?$/.test(file) && !/\.(?:test|spec)\./.test(file)) results.push(file);
  }
  return results;
}
function namespace(file) {
  if (file.includes("admin-analytics")) return "admin";
  if (file.includes("/auth/")) return "authentication";
  if (file.includes("/dashboard/")) return "dashboard";
  if (file.includes("/progress/")) return "progress";
  if (file.includes("/gamification/")) return "rewards";
  if (file.includes("/community/")) return "community";
  if (file.includes("/profile/") || file.includes("/settings/")) return "settings";
  if (file.includes("/plans/") || file.includes("/billing/")) return "subscriptions";
  if (file.includes("/landing/") || file.includes("/legal/")) return "public";
  if (file.includes("/layout/")) return "navigation";
  if (file.includes("/api/") || file.includes("/error")) return "errors";
  if (/\/(lesson|quiz|modules|categories|resources|simplified)\//.test(file)) return "learning";
  return "common";
}
function meaningful(text) { return /[A-Za-z]{2}/.test(text.replaceAll(/\{\{[^}]+\}\}/g, "")) && text !== "Survival Academy" && text !== "lowercase-handle-123"; }
function record(source, file, node, text, kind, extra = {}) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!meaningful(cleaned)) return;
  const position = source.getLineAndCharacterOfPosition(node.getStart(source));
  const slug = cleaned.toLowerCase().replace(/\{\{[^}]+\}\}/g, "value").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").split("_").slice(0, 7).join("_");
  entries.push({ namespace: namespace(file), key: slug + "_" + createHash("sha1").update(cleaned).digest("hex").slice(0, 6), text: cleaned, kind, file, line: position.line + 1, start: node.getStart(source), end: node.end, ...extra });
}
for (const filePath of await files("src")) {
  const file = filePath.replaceAll("\\", "/");
  if (file === "src/lib/geo/countries.ts" || file.endsWith("/BrandMark.tsx")) continue;
  const code = await readFile(filePath, "utf8");
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node) {
    if (ts.isJsxText(node)) record(source, file, node, node.text, "jsx-text");
    if (ts.isStringLiteral(node)) {
      const parent = node.parent;
      if (ts.isJsxAttribute(parent) && attributeFields.has(parent.name.text)) record(source, file, node, node.text, "jsx-attribute");
      else if (ts.isPropertyAssignment(parent) && labelFields.has(parent.name.getText(source).replaceAll('"', "").replaceAll("'", ""))) record(source, file, node, node.text, "label-property");
      else if (ts.isJsxExpression(parent)) record(source, file, node, node.text, "jsx-string");
    }
    const expressionParent = node.parent && ts.isJsxExpression(node.parent) ? node.parent.parent : undefined;
    const userExpression = expressionParent && (!ts.isJsxAttribute(expressionParent) || attributeFields.has(expressionParent.name.text));
    const userProperty = node.parent && ts.isPropertyAssignment(node.parent) && labelFields.has(node.parent.name.getText(source).replaceAll('"', "").replaceAll("'", ""));
    if (ts.isTemplateExpression(node) && (userExpression || userProperty)) {
      let text = node.head.text;
      const expressions = [];
      for (const span of node.templateSpans) {
        expressions.push(span.expression.getText(source));
        text += "{{value" + (expressions.length - 1) + "}}" + span.literal.text;
      }
      record(source, file, node, text, "template", { expressions });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const unique = new Map(entries.map((entry) => [entry.namespace + ":" + entry.key, entry]));
await mkdir("docs/i18n", { recursive: true });
await writeFile("docs/i18n/ui-source-inventory.json", JSON.stringify({ generatedBy: "scripts/i18n/audit-source.mjs", occurrences: entries, unique: [...unique.values()] }, null, 2) + "\n");
const domains = {};
for (const entry of unique.values()) domains[entry.namespace] = (domains[entry.namespace] ?? 0) + 1;
console.log(JSON.stringify({ occurrences: entries.length, unique: unique.size, domains }));
