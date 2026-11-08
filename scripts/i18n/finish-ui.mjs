/** Targeted extraction of legal text and display-only arrays missed by the JSX audit. */
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
import { createHash } from "node:crypto";
const catalogs = new Map();
async function catalog(namespace) {
  if (!catalogs.has(namespace)) catalogs.set(namespace, JSON.parse(await readFile(`src/i18n/locales/en/${namespace}.json`, "utf8")));
  return catalogs.get(namespace);
}
function keyFor(text) { return "copy_" + createHash("sha256").update(text).digest("hex").slice(0, 12); }
async function edit(file, select, namespace) {
  const text = await readFile(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const entries = await catalog(namespace); const changes = [];
  function visit(node) {
    if (ts.isStringLiteral(node) && select(node)) {
      const key = keyFor(node.text); entries[key] = node.text;
      changes.push({ start: node.getStart(source), end: node.end, text: `uiText("${namespace}:${key}")` });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  let next = text;
  for (const change of changes.sort((a, b) => b.start - a.start)) next = next.slice(0, change.start) + change.text + next.slice(change.end);
  await writeFile(file, next);
}
await edit("src/features/legal/PrivacyScreen.tsx", (node) => ts.isPropertyAssignment(node.parent) && node.parent.name.getText() === "body", "public");
// Keep English keys in the legal source map stable; translate headings only at render time.
const termsPath = "src/features/legal/TermsScreen.tsx";
const termsText = await readFile(termsPath, "utf8");
const termsSource = ts.createSourceFile(termsPath, termsText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const headingEntries = [];
function headings(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText() === "SECTION_TITLES") {
    let initializer = node.initializer;
    if (ts.isAsExpression(initializer)) initializer = initializer.expression;
    for (const element of initializer.elements) if (ts.isStringLiteral(element)) headingEntries.push(element.text);
  }
  ts.forEachChild(node, headings);
}
headings(termsSource);
await edit(termsPath, (node) => ts.isPropertyAssignment(node.parent) && node.parent.initializer === node && ts.isStringLiteral(node.parent.name), "public");
const publicCatalog = await catalog("public");
for (const heading of headingEntries) publicCatalog[keyFor(heading)] = heading;
const headingMap = "const LEGAL_HEADINGS: Record<string, () => string> = {\n" + headingEntries.map((heading) => `  ${JSON.stringify(heading)}: () => uiText("public:${keyFor(heading)}"),`).join("\n") + "\n};\n\n";
let termsNext = await readFile(termsPath, "utf8");
termsNext = termsNext.replace("export function TermsScreen()", headingMap + "export function TermsScreen()").replace("{title}\n", "{LEGAL_HEADINGS[title]?.() ?? title}\n");
await writeFile(termsPath, termsNext);
// Taglines are display copy, unlike category codes or CSS class names.
await edit("src/lib/category-visuals.ts", (node) => ts.isPropertyAssignment(node.parent) && node.parent.name.getText() === "tagline", "learning");
// Make module-level taglines resolve at read time, just like descriptions.
let visuals = await readFile("src/lib/category-visuals.ts", "utf8");
visuals = visuals.replace(/tagline: (uiText\([^\n]+\)),/g, "get tagline() { return $1; },");
await writeFile("src/lib/category-visuals.ts", visuals);
for (const [ns, entries] of catalogs) await writeFile(`src/i18n/locales/en/${ns}.json`, JSON.stringify(entries, null, 2) + "\n");
// These entries were unused state-machine names, never UI text.
const learning = JSON.parse(await readFile("src/i18n/locales/en/learning.json", "utf8"));
for (const key of ["loading_14b85f", "recover_55bc5d", "ready_75c053", "active_2bb6b9", "error_11f957", "creating_ad4e9a", "result_37a530", "submitting_8ee0db"]) delete learning[key];
await writeFile("src/i18n/locales/en/learning.json", JSON.stringify(learning, null, 2) + "\n");
