/**
 * Source migration, never DOM/page translation. Extracts explicit UI copy into
 * i18next namespaces. Canonical IDs, routes, CSS, user data and API values stay
 * unchanged. Originals are saved under ignored tmp/i18n-ui-originals/.
 */
import ts from "typescript";
import path from "node:path";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const fields = new Set(["title", "subtitle", "description", "label", "hint", "placeholder", "eyebrow", "alt", "aria-label", "aria-description", "emptyTitle", "emptyDescription", "message", "note", "text", "confirmationText", "confirmLabel", "cancelLabel"]);
const attributes = new Set([...fields].filter((value) => value !== "name"));
const resources = {};
for (const item of await readdir("src/i18n/locales/en")) {
  if (item.endsWith(".json")) resources[item.slice(0, -5)] = JSON.parse(await readFile("src/i18n/locales/en/" + item, "utf8"));
}
const occurrences = [];
const changed = [];

function domain(file) {
  if (file.includes("/admin-analytics/")) return "admin";
  if (file.includes("/auth/")) return "authentication";
  if (file.includes("/dashboard/")) return "dashboard";
  if (file.includes("/progress/")) return "progress";
  if (file.includes("/gamification/")) return "rewards";
  if (file.includes("/community/")) return "community";
  if (file.includes("/profile/")) return "settings";
  if (/\/(plans|billing)\//.test(file)) return "subscriptions";
  if (/\/(landing|legal)\//.test(file)) return "public";
  if (file.includes("/layout/")) return "navigation";
  if (file.includes("/api/") || file.includes("/error")) return "errors";
  if (/\/(lesson|quiz|modules|categories|resources|simplified)\//.test(file)) return "learning";
  return "common";
}
function decode(text) {
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_match, entity) => {
    if (entity.startsWith("#")) return String.fromCodePoint(entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
    return entities[entity.toLowerCase()];
  });
}
function jsxText(text) {
  const lines = text.replaceAll("\t", " ").split(/\r\n|\n|\r/);
  let lastNonempty = -1;
  lines.forEach((line, index) => { if (/[^ ]/.test(line)) lastNonempty = index; });
  let result = "";
  lines.forEach((line, index) => {
    let value = line;
    if (index !== 0) value = value.replace(/^ +/, "");
    if (index !== lines.length - 1) value = value.replace(/ +$/, "");
    if (value) result += value + (index !== lastNonempty ? " " : "");
  });
  return decode(result);
}
function useful(value) {
  const text = value.trim();
  if (!/[A-Za-z]{2}/.test(text) || text === "Survival Academy") return false;
  if (/^[a-z0-9]+(?:[_-][a-z0-9]+)+$/.test(text)) return false;
  if (/^(?:https?:|\/|var\(|color-mix\(|0 0 |text\/|image\/)/.test(text)) return false;
  return true;
}
function primitive(type) {
  if (type.isUnion()) return type.types.every(primitive);
  return Boolean(type.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined));
}
function hasJSX(node) {
  let found = false;
  function visit(child) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) { found = true; return; }
    ts.forEachChild(child, visit);
  }
  ts.forEachChild(node, visit);
  return found;
}
for (const source of program.getSourceFiles()) {
  const file = path.relative(process.cwd(), source.fileName).replaceAll("\\", "/");
  if (!file.startsWith("src/") || /\.(test|spec|d)\.ts/.test(file) || /\/(i18n|test|types|assets)\//.test(file)) continue;
  if (file === "src/lib/geo/countries.ts" || file.endsWith("/BrandMark.tsx") || file.includes("/admin-analytics/")) continue;
  const original = source.text;
  if (original.includes("tr as uiText")) continue;
  const namespace = domain(file);
  const edits = [];
  let count = 0;
  function queue(start, end, text) {
    if (edits.some((edit) => edit.start <= start && edit.end >= end && edit.end !== edit.start)) return;
    for (let index = edits.length - 1; index >= 0; index--) {
      if (start <= edits[index].start && end >= edits[index].end && start !== end) edits.splice(index, 1);
    }
    edits.push({ start, end, text });
  }
  function keyFor(text, node, kind) {
    const value = text.replace(/\s+/g, " ").trim();
    const slug = value.toLowerCase().replace(/\{\{[^}]+\}\}/g, "value").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").split("_").slice(0, 7).join("_");
    const key = slug + "_" + createHash("sha1").update(value).digest("hex").slice(0, 6);
    resources[namespace] ??= {};
    resources[namespace][key] = value;
    occurrences.push({ namespace, key, text: value, file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, kind });
    count++;
    return namespace + ":" + key;
  }
  function call(text, node, kind, values = []) {
    const key = keyFor(text, node, kind);
    return "uiText(" + JSON.stringify(key) + (values.length ? ", { " + values.map((value, index) => "value" + index + ": uiValue(" + value + ")").join(", ") + " }" : "") + ")";
  }
  function nearestExpressionAttribute(node) {
    let current = node.parent;
    while (current && !ts.isJsxExpression(current) && !ts.isSourceFile(current)) current = current.parent;
    if (!current || !ts.isJsxExpression(current)) return null;
    return ts.isJsxAttribute(current.parent) ? current.parent.name.text : "children";
  }
  function uiLiteral(node) {
    const context = nearestExpressionAttribute(node);
    if (context === null || context !== "children" && !attributes.has(context)) return false;
    const parent = node.parent;
    if (ts.isJsxExpression(parent)) return true;
    if (ts.isConditionalExpression(parent)) return parent.whenTrue === node || parent.whenFalse === node;
    if (ts.isBinaryExpression(parent)) return [ts.SyntaxKind.PlusToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(parent.operatorToken.kind);
    return false;
  }
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const children = [...node.children];
      const expressions = children.filter(ts.isJsxExpression).filter((child) => child.expression);
      const textNodes = children.filter(ts.isJsxText);
      const canGroup = expressions.length > 0 && textNodes.some((child) => useful(jsxText(child.text)))
        && children.every((child) => ts.isJsxText(child) || ts.isJsxExpression(child))
        && expressions.every((child) => !hasJSX(child.expression) && primitive(checker.getTypeAtLocation(child.expression)));
      if (canGroup) {
        const values = [];
        let pattern = "";
        for (const child of children) {
          if (ts.isJsxText(child)) pattern += jsxText(child.text);
          else if (child.expression) { pattern += "{{value" + values.length + "}}"; values.push(child.expression.getText(source)); }
        }
        if (useful(pattern)) {
          queue(children[0].pos, children.at(-1).end, "{" + call(pattern, node, "interpolated-children", values) + "}");
        }
      }
    }
    if (ts.isJsxText(node) && useful(jsxText(node.text))) {
      const value = jsxText(node.text);
      queue(node.pos, node.end, (value.startsWith(" ") ? '{" "}' : "") + "{" + call(value, node, "jsx-text") + "}" + (value.endsWith(" ") ? '{" "}' : ""));
    }
    if (ts.isStringLiteral(node) && useful(decode(node.text))) {
      const parent = node.parent;
      if (ts.isJsxAttribute(parent) && attributes.has(parent.name.text)) {
        queue(node.getStart(source), node.end, "{" + call(decode(node.text), node, "jsx-attribute") + "}");
      } else if (ts.isPropertyAssignment(parent) && fields.has(parent.name.getText(source).replaceAll('"', "").replaceAll("'", ""))) {
        queue(parent.getStart(source), parent.end, "get " + parent.name.getText(source) + "() { return " + call(node.text, node, "label-property") + "; }");
      } else if (uiLiteral(node)) {
        const value = node.text;
        queue(node.getStart(source), node.end, (value.startsWith(" ") ? '" " + ' : "") + call(value, node, "jsx-expression-string") + (value.endsWith(" ") ? ' + " "' : ""));
      }
    }
    if (ts.isTemplateExpression(node)) {
      const expressionAttribute = nearestExpressionAttribute(node);
      const parent = node.parent;
      const property = ts.isPropertyAssignment(parent) && fields.has(parent.name.getText(source).replaceAll('"', "").replaceAll("'", ""));
      if (property || expressionAttribute !== null && (expressionAttribute === "children" || attributes.has(expressionAttribute))) {
        let pattern = node.head.text;
        const values = [];
        for (const span of node.templateSpans) { pattern += "{{value" + values.length + "}}" + span.literal.text; values.push(span.expression.getText(source)); }
        if (useful(pattern) && !pattern.startsWith("{{value0}}/")) {
          const text = call(pattern, node, "template", values);
          if (property) queue(parent.getStart(source), parent.end, "get " + parent.name.getText(source) + "() { return " + text + "; }");
          else queue(node.getStart(source), node.end, text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (edits.length === 0) continue;
  const needsValue = edits.some((edit) => edit.text.includes("uiValue("));
  // Subscribe components without remounting or changing router identity.
  if (file.endsWith(".tsx")) {
    function subscribeComponents(node) {
      let name = node.name?.getText(source);
      if (!name && ts.isArrowFunction(node) && ts.isVariableDeclaration(node.parent)) name = node.parent.name.getText(source);
      if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && name && /^[A-Z]/.test(name) && hasJSX(node) && node.body && ts.isBlock(node.body)) {
        queue(node.body.getStart(source) + 1, node.body.getStart(source) + 1, "\n  useInterfaceLocale();");
      }
      ts.forEachChild(node, subscribeComponents);
    }
    subscribeComponents(source);
  }
  const imports = "import { tr as uiText" + (file.endsWith(".tsx") ? ", useLocale as useInterfaceLocale" : "") + (needsValue ? ", uiValue" : "") + ' } from "@/i18n";\n';
  queue(source.statements[0]?.getStart(source) ?? 0, source.statements[0]?.getStart(source) ?? 0, imports);
  let next = original;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  const backup = "tmp/i18n-ui-originals/" + file;
  await mkdir(path.dirname(backup), { recursive: true });
  try { await readFile(backup); } catch { await writeFile(backup, original); }
  await writeFile(file, next);
  changed.push({ file, strings: count });
}
for (const [namespace, values] of Object.entries(resources)) await writeFile("src/i18n/locales/en/" + namespace + ".json", JSON.stringify(values, null, 2) + "\n");
const namespaces = Object.keys(resources).sort();
await writeFile("src/i18n/locales/en/index.ts", namespaces.map((namespace) => 'import ns_' + namespace + ' from "./' + namespace + '.json";').join("\n") + "\nexport default { " + namespaces.map((namespace) => namespace + ": ns_" + namespace).join(", ") + " };\n");
await writeFile("docs/i18n/ui-migration-manifest.json", JSON.stringify({ changed, occurrences, domains: Object.fromEntries(Object.entries(resources).map(([ns, values]) => [ns, Object.keys(values).length])) }, null, 2) + "\n");
console.log(JSON.stringify({ changedFiles: changed.length, domains: Object.fromEntries(Object.entries(resources).map(([ns, values]) => [ns, Object.keys(values).length])) }));
