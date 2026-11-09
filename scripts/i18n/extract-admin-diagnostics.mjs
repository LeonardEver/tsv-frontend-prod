/** Read static backend diagnostic definitions without executing backend code. */
import ts from "typescript";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const constants = new Map();
const messages = new Map();
function evaluate(node) {
  if (!node) return null;
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) return evaluate(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isIdentifier(node)) return evaluate(constants.get(node.text));
  if (ts.isPropertyAccessExpression(node)) {
    const root = constants.get(node.expression.getText());
    const object = root && ts.isAsExpression(root) ? root.expression : root;
    if (object && ts.isObjectLiteralExpression(object)) return evaluate(object.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText() === node.name.text)?.initializer);
    return null;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evaluate(node.left), right = evaluate(node.right);
    return left !== null && right !== null ? left + right : null;
  }
  if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((span) => "{{" + span.expression.getText().replace(/\W/g, "_") + "}}" + span.literal.text).join("");
  return null;
}
function add(text) {
  if (typeof text === "string" && text.length > 35 && /[a-zA-Z]+ [a-zA-Z]+/.test(text)) messages.set(createHash("sha256").update(text).digest("hex").slice(0, 16), text);
}
for (const file of ["../backend/src/modules/admin/config.ts", "../backend/src/modules/admin/api/service.ts"]) {
  const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true);
  function declarations(node) { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) constants.set(node.name.text, node.initializer); ts.forEachChild(node, declarations); }
  declarations(source);
  function walk(node, inNotes = false) {
    const notes = inNotes || (ts.isPropertyAssignment(node) && node.name.getText() === "notes");
    if (notes && ts.isConditionalExpression(node)) { add(evaluate(node.whenTrue)); add(evaluate(node.whenFalse)); }
    if (ts.isPropertyAssignment(node) && ["duration_caveat", "stages_are_not_nested", "achievements_empty"].includes(node.name.getText())) add(evaluate(node.initializer));
    if (notes && ts.isPropertyAssignment(node)) add(evaluate(node.initializer));
    ts.forEachChild(node, (child) => walk(child, notes));
  }
  walk(source);
}
for (const name of ["METRIC_NOTES", "UNSUPPORTED_METRICS"]) {
  const root = constants.get(name);
  const object = root && ts.isAsExpression(root) ? root.expression : root;
  function values(node) { if (ts.isPropertyAssignment(node)) add(evaluate(node.initializer)); ts.forEachChild(node, values); }
  if (object) values(object);
}
add(evaluate(constants.get("LESSON_DURATION_CAVEAT")));
await writeFile("docs/i18n/admin-diagnostic-sources.json", JSON.stringify(Object.fromEntries(messages), null, 2) + "\n");
console.log(messages.size, "canonical diagnostic messages");
