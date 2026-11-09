import { afterEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import en from "./locales/en";
import pt from "./locales/pt-BR";
import es from "./locales/es";
import fr from "./locales/fr";
import de from "./locales/de";
import itCopy from "./locales/it";
import { changeLocale, i18n, tr } from "./index";
import { ContentLanguageNotice } from "./ContentLanguageNotice";
import { subcategoryTitle } from "./subcategories";

const catalogs = { en, "pt-BR": pt, es, fr, de, it: itCopy };
const placeholders = (value: string) => [...value.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1]).sort();

afterEach(async () => { i18n.addResourceBundle("it", "rewards", itCopy.rewards, true, true); await changeLocale("en"); });

describe("authored locale catalogs", () => {
  it.each(Object.entries(catalogs))("covers every namespace and placeholder in %s", (_locale, resources) => {
    expect(Object.keys(resources).sort()).toEqual(Object.keys(en).sort());
    for (const namespace of Object.keys(en) as Array<keyof typeof en>) {
      const source = en[namespace]; const target = resources[namespace] as Record<string, string>;
      expect(Object.keys(target).sort(), namespace).toEqual(Object.keys(source).sort());
      for (const [key, text] of Object.entries(source)) {
        const translated = target[key];
        expect(translated?.trim(), namespace + ":" + key).toBeTruthy();
        expect(placeholders(translated ?? ""), namespace + ":" + key).toEqual(placeholders(text));
      }
    }
  });
  it("keeps missing catalog text in the selected language", async () => {
    await changeLocale("it");
    i18n.removeResourceBundle("it", "rewards");
    expect(tr("rewards:current_title_3d4b9e")).toBe("Testo non disponibile");
  });
  it("uses real plurals for translated counts", async () => {
    await changeLocale("de");
    expect(tr("attempts", { count: 1 })).toBe("1 Versuch");
    expect(tr("attempts", { count: 2 })).toBe("2 Versuche");
    expect(tr("attempts", { count: 1200 })).toBe("1.200 Versuche");
    await changeLocale("it");
    expect(tr("questions", { count: 2 })).toBe("2 domande");
  });
  it("localizes canonical subsection labels without translating slugs", async () => {
    await changeLocale("pt-BR");
    expect(subcategoryTitle("emergency-planning")).toBe("Planejamento de emergência");
    await changeLocale("de");
    expect(subcategoryTitle("wound-care")).toBe("Wundversorgung");
    expect(subcategoryTitle("new-topic")).toBe("New topic");
  });
  it("discloses English PDF artifacts without treating localized metadata as English fallback", async () => {
    await changeLocale("pt-BR");
    renderWithProviders(<ContentLanguageNotice data={{ localization: { fallback: false, content_locale: "pt-BR", artifact_locale: "en" } }} />);
    expect(screen.getByRole("note")).toHaveTextContent("inglês");
    expect(screen.queryByRole("combobox")).toBeNull();
  });
  it("does not show fallback for fully localized instructional content", async () => {
    await changeLocale("es");
    renderWithProviders(<ContentLanguageNotice data={{ localization: { fallback: false, content_locale: "es" } }} />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
