import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderAtRoute } from "@/test/render";
import { queryKeys, allLocales } from "@/lib/api/keys";
import { browserLocale, normalizeLocale, resolveLocale } from "./config";
import { changeLocale, explicitLocale, getLocale, initializeLocale, useLocale } from "./index";
import { LanguageSelector } from "./LanguageSelector";

beforeEach(async () => {
  localStorage.removeItem("survival-academy-language");
  await changeLocale("en");
});
afterEach(async () => {
  vi.restoreAllMocks();
  localStorage.removeItem("survival-academy-language");
  await changeLocale("en");
});

describe("locale resolution", () => {
  it("normalizes browser variants into the six canonical UI locales", () => {
    expect(normalizeLocale("pt-PT")).toBe("pt-BR");
    expect(normalizeLocale("PT_br")).toBe("pt-BR");
    expect(normalizeLocale("es-MX")).toBe("es");
    expect(normalizeLocale("fr-CA")).toBe("fr");
    expect(normalizeLocale("de-AT")).toBe("de");
    expect(normalizeLocale("it-CH")).toBe("it");
    expect(normalizeLocale("en-GB")).toBe("en");
    expect(normalizeLocale("ja")).toBeNull();
    expect(normalizeLocale("../../pt")).toBeNull();
  });

  it("uses the first supported browser preference", () => {
    expect(browserLocale(["ja-JP", "fr-CA", "de"])).toBe("fr");
  });

  it.each([
    { account: "pt-BR", explicit: "de", browsers: ["de-DE"], country: "DE", expected: "pt-BR", source: "account" },
    { explicit: "en", browsers: ["pt-BR"], country: "BR", expected: "en", source: "local" },
    { explicit: "es", browsers: ["en-US"], country: "US", expected: "es", source: "local" },
    { browsers: ["de-DE"], country: "BR", expected: "de", source: "browser" },
    { browsers: ["ja"], country: "IT", expected: "it", source: "country" },
    { browsers: ["ja"], country: "JP", expected: "en", source: "fallback" },
  ])("resolves preferences independently of location: $expected", ({ expected, source, ...input }) => {
    expect(resolveLocale(input)).toEqual({ locale: expected, source });
  });

  it("does not persist an inferred suggestion until the user confirms it", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-CA"]);
    await initializeLocale();
    expect(getLocale()).toBe("fr");
    expect(explicitLocale()).toBeNull();
    await changeLocale("fr", { explicit: true });
    expect(explicitLocale()).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("restores an explicit local choice before considering the browser", async () => {
    await changeLocale("it", { explicit: true });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE"]);
    await initializeLocale();
    expect(getLocale()).toBe("it");
  });

  it("separates localized content caches while preserving canonical IDs and mutation invalidation", async () => {
    const english = queryKeys.content.lesson("WAT-boiling-L01");
    await changeLocale("pt-BR");
    const portuguese = queryKeys.content.lesson("WAT-boiling-L01");
    expect(english).not.toEqual(portuguese);
    expect(english[1]).toBe(portuguese[1]);
    expect(allLocales(english)).toEqual(allLocales(portuguese));
    expect(queryKeys.auth.me).toEqual(["auth", "me"]);
  });

  it("switches through an accessible selector without remounting form state or navigating", async () => {
    function Form() {
      useLocale();
      const [value, setValue] = useState("");
      return <><input aria-label="Draft" value={value} onChange={(event) => { setValue(event.target.value); }} /><LanguageSelector onChange={(locale) => { void changeLocale(locale, { explicit: true }); }} /></>;
    }
    const { router } = renderAtRoute(<Form />, "/modules/WAT-boiling/lesson");
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Draft" }), "keep this draft");
    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "fr");
    await act(async () => { await changeLocale("fr", { explicit: true }); });
    expect(screen.getByRole("combobox", { name: "Langue" })).toHaveValue("fr");
    expect(screen.getByRole("textbox", { name: "Draft" })).toHaveValue("keep this draft");
    expect(router.state.location.pathname).toBe("/modules/WAT-boiling/lesson");
  });
});
