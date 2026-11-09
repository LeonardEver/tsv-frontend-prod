/** Broad audit complements the JSX heuristic; includes constants/returns/branches. */
import ts from "typescript";
import { readFile, readdir, writeFile } from "node:fs/promises";
const candidates = [];
async function scan(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = folder + "/" + entry.name;
    if (entry.isDirectory()) { if (!["i18n", "test", "types", "assets"].includes(entry.name)) await scan(path); continue; }
    if (!/\.tsx?$/.test(path) || /\.(test|spec)\./.test(path)) continue;
    const text = await readFile(path, "utf8");
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
        const value = ts.isTemplateExpression(node) ? node.getText(source) : node.text;
        const parent = node.parent;
        const attribute = ts.isJsxAttribute(parent) ? parent.name.getText(source) : undefined;
        const isTechnical = attribute && ["className", "style", "to", "href", "src", "accept", "data-testid"].includes(attribute);
        const css = /(?:^|\s)(?:flex|grid|text-|bg-|border-|mt-|px-|gap-|font-|items-|sm:|md:|lg:|h-|w-|aria-|data-)/.test(value);
        if (!isTechnical && !css && /[a-zA-Z]{2}[^\S\r\n]+[a-zA-Z]{2}/.test(value) && !value.includes("@/") && !value.includes("function ")) {
          candidates.push({ file: path, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind: ts.SyntaxKind[parent.kind], text: value });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
await scan("src");
await writeFile("docs/i18n/all-literals-inventory.json", JSON.stringify({ candidates }, null, 2) + "\n");
console.log(JSON.stringify(candidates, null, 2));
