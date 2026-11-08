/**
 * The console's translation layer, tested as data rather than through the
 * DOM: the dictionary is what has to be complete and consistent, and a
 * placeholder that does not line up between the two languages would show up
 * as a literal `{{count}}` on screen.
 */
import { afterEach, describe, expect, it } from "vitest";
import { STRINGS, interpolate, translate } from "./dictionary";
import { trFor } from "./i18n";
import { DEFAULT_ADMIN_LANGUAGE, setAdminLanguage, __resetAdminLanguage } from "./language";

const LANGUAGES = ["en", "pt"] as const;

/** Every leaf path in a dictionary tree. */
function paths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    paths(child, prefix === "" ? key : `${prefix}.${key}`),
  );
}

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

function placeholders(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "").sort();
}

afterEach(async () => {
  await __resetAdminLanguage();
  window.localStorage.clear();
});

describe("admin analytics dictionary", () => {
  it("gives both languages the same shape", () => {
    for (const language of LANGUAGES) {
      expect(paths(STRINGS[language]).length).toBeGreaterThan(0);
    }
    expect(paths(STRINGS.pt)).toEqual(paths(STRINGS.en));
  });

  it("binds every placeholder the same way in both languages", () => {
    // A translation that renames or drops a placeholder renders "{{days}}"
    // to the admin instead of a number.
    for (const key of paths(STRINGS.en)) {
      const en = translate("en", key);
      const pt = translate("pt", key);
      expect(placeholders(pt), key).toEqual(placeholders(en));
    }
  });

  it("has no empty entries", () => {
    for (const key of paths(STRINGS.en)) {
      expect(translate("en", key).trim(), `en ${key}`).not.toBe("");
      expect(translate("pt", key).trim(), `pt ${key}`).not.toBe("");
    }
  });

  it("renders the English copy unchanged", () => {
    // The English column is the production copy, moved rather than
    // rewritten; a few representative strings pin that.
    expect(translate("en", "nav.title")).toBe("Product analytics");
    expect(translate("en", "charts.notYetObservable")).toBe("not yet observable");
    expect(translate("en", "tabs.retention.colCohort")).toBe("Cohort");
  });

  it("translates the console's chrome", () => {
    expect(translate("pt", "nav.title")).toBe("Analytics de produto");
    expect(translate("pt", "charts.notYetObservable")).toBe("ainda não observável");
    expect(translate("pt", "tabs.retention.colCohort")).toBe("Coorte");
  });

  it("fills placeholders without leaving the template behind", () => {
    const rendered = interpolate("pt", "tabs.retention.usersCount", { count: "120" });
    expect(rendered).toBe("120 usuários");
    expect(rendered).not.toContain("{{");
  });

  it("fails loudly when a caller omits a value", () => {
    expect(() => interpolate("en", "tabs.stalled.daysStalled", {})).toThrow(/days/);
  });

  it("reports an unknown key rather than rendering blank", () => {
    expect(translate("en", "charts.notAKey")).toBe("charts.notAKey");
  });

  it("exposes the same accessors outside React", () => {
    const tr = trFor("pt");
    expect(tr.t("nav.eyebrow")).toBe("Admin");
    expect(tr.language).toBe("pt");
    expect(tr.errorCopy(new Error("boom")).title).toBe("Algo deu errado.");
  });
});

describe("admin analytics language store", () => {
  it("defaults to English", () => {
    expect(DEFAULT_ADMIN_LANGUAGE).toBe("en");
    expect(trFor(DEFAULT_ADMIN_LANGUAGE).t("nav.title")).toBe("Product analytics");
  });

  it("keeps the choice in the shared app preference", async () => {
    await setAdminLanguage("pt");
    expect(window.localStorage.getItem("survival-academy-language")).toBe("pt-BR");
    // Not the user's data and not a backend concern: the key is local only.
    await setAdminLanguage("en");
    expect(window.localStorage.getItem("survival-academy-language")).toBe("en");
  });
});
