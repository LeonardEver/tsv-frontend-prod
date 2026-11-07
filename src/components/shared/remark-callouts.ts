/**
 * remark-callouts (Phase 24 §13) — semantic content blocks rendered
 * from existing lesson markdown. Content is NEVER modified: this only
 * upgrades the PRESENTATION of blockquotes that already begin with a
 * field-manual marker:
 *
 *   > **Warning:** Keep matches dry.
 *   > Safety: never enter a burning structure.
 *   > **Field note:** altitude changes boiling times.
 *
 * Matching blockquotes become `.callout .callout--{type}` elements with
 * a `.callout-title` header carrying the marker label. Anything without
 * a marker stays a plain blockquote — no paragraph is ever card-ified.
 *
 * The transform emits `data.hName`/`data.hProperties` so
 * react-markdown renders them as native elements — no raw HTML, no
 * dangerouslySetInnerHTML (the security boundary stays intact).
 */

const MARKER_TO_TYPE: Record<string, string> = {
  "FIELD NOTE": "field-note",
  WARNING: "warning",
  SAFETY: "safety",
  IMPORTANT: "important",
  REMEMBER: "remember",
  PROCEDURE: "procedure",
  EXAMPLE: "example",
  "KNOWLEDGE CHECK": "knowledge-check",
};

interface MdastNode {
  type: string;
  children?: MdastNode[];
  data?: {
    hName?: string;
    hProperties?: { className?: string[] };
  };
  value?: string;
}

function nodeText(node: MdastNode): string {
  if (node.value !== undefined) return node.value;
  return (node.children ?? []).map(nodeText).join("");
}

const MARKER_PATTERN =
  /^(?:⚠️?\s*)?(?:[*_]{0,2})(FIELD NOTE|WARNING|SAFETY|IMPORTANT|REMEMBER|PROCEDURE|EXAMPLE|KNOWLEDGE CHECK)(?:[*_]{0,2})\s*[:：]?\s*(.*)$/i;

function walk(node: MdastNode, visitFn: (n: MdastNode) => void): void {
  visitFn(node);
  for (const child of node.children ?? []) walk(child, visitFn);
}

export function remarkCallouts() {
  return (tree: MdastNode): void => {
    walk(tree, (node) => {
      if (node.type !== "blockquote") return;
      const first = node.children?.[0];
      if (!first || first.type !== "paragraph") return;

      // Flatten soft line breaks: the marker regex must see one line.
      const text = nodeText(first).replace(/\s+/g, " ").trim();
      const match = text.match(MARKER_PATTERN);
      if (!match) return;
      const markerLabel = match[1];
      const markerRest = match[2];
      if (!markerLabel) return;

      const type = MARKER_TO_TYPE[markerLabel.toUpperCase()];
      if (!type) return;

      const remaining = (markerRest ?? "").trim();
      const titleParagraph: MdastNode = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: { className: ["callout-title"] },
        },
        children: [{ type: "text", value: markerLabel.toUpperCase() }],
      };

      const rest = (node.children ?? []).slice(1);
      let body: MdastNode[];
      if (remaining.length > 0) {
        const bodyFirst: MdastNode = {
          type: "paragraph",
          children: [{ type: "text", value: remaining }],
        };
        body = [bodyFirst, ...rest];
      } else {
        body = rest;
      }

      node.type = "callout";
      node.data = {
        hName: "div",
        hProperties: { className: ["callout", `callout--${type}`] },
      };
      node.children = [titleParagraph, ...body];
    });
  };
}
