/**
 * Custom ESLint rule: no-unrestricted-local-storage.
 *
 * Permitted localStorage use is limited to:
 *   - the user's own temporary quiz draft (keys starting with
 *     "quiz-draft:"; frontend spec §18 + Phase 10 task §18)
 *   - the device theme preference (the single literal key "theme-pref";
 *     a sanctioned UI pref per the frontend spec §8.2/§24 — device-scoped,
 *     carries no user data)
 *
 * Every other write/read is reported so the policy is enforced at review
 * time. Auth tokens, session data, server cache and gamification state
 * must never be persisted client-side.
 *
 * Rule options: none.
 */
const ALLOWED_KEY_PREFIX = "quiz-draft:";
const ALLOWED_EXACT_KEYS = new Set(["theme-pref"]);

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "localStorage writes/reads are restricted to the user-owned quiz draft namespace",
    },
    messages: {
      restrictedStorage:
        "localStorage usage is restricted to the quiz-draft namespace (keys starting with '{{ prefix }}'). Auth tokens, session data, server cache and gamification state must never be persisted client-side.",
    },
    schema: [],
  },
  create(context) {
    function isStorageMethod(node) {
      if (node.type !== "CallExpression" || !node.callee || node.callee.type !== "MemberExpression") return false;
      const obj = node.callee.object;
      const prop = node.callee.property;
      if (obj?.type !== "Identifier" || obj.name !== "localStorage") return false;
      return prop?.type === "Identifier" && ["setItem", "getItem", "removeItem"].includes(prop.name);
    }

    function calleeNameMatchesDraftKey(node) {
      if (!node) return false;
      if (node.type === "Identifier") return /draftkey$/i.test(node.name);
      if (node.type === "MemberExpression" && node.property?.type === "Identifier") {
        return /draftkey$/i.test(node.property.name);
      }
      return false;
    }

    function hasAllowedKey(node) {
      const keyArg = node.arguments?.[0];
      if (!keyArg) return false;
      // Literal / template keys must provably start with the namespace.
      if (keyArg.type === "Literal") {
        return (
          typeof keyArg.value === "string" &&
          (keyArg.value.startsWith(ALLOWED_KEY_PREFIX) ||
            ALLOWED_EXACT_KEYS.has(keyArg.value))
        );
      }
      if (keyArg.type === "TemplateLiteral") {
        return Boolean(keyArg.quasis?.[0]?.value?.cooked?.startsWith(ALLOWED_KEY_PREFIX));
      }
      // Helper-produced keys: a call to a *draftKey helper, or an
      // identifier whose value is a draft key (e.g. the result of
      // localStorage.key() filtered by the namespace prefix at runtime).
      if (keyArg.type === "CallExpression") {
        return calleeNameMatchesDraftKey(keyArg.callee);
      }
      if (keyArg.type === "Identifier") {
        return /^(draftKey|key)$/i.test(keyArg.name);
      }
      return false;
    }

    return {
      CallExpression(node) {
        if (isStorageMethod(node) && !hasAllowedKey(node)) {
          context.report({
            node,
            messageId: "restrictedStorage",
            data: { prefix: ALLOWED_KEY_PREFIX },
          });
        }
      },
    };
  },
};
