import { afterEach, describe, expect, it } from "vitest";
import { assertContentLocale } from "./content-response";
import { changeLocale } from "./index";
import { describeError } from "@/lib/api/error-map";

afterEach(async () => { await changeLocale("en"); });

describe("selected-language content boundary", () => {
  it.each([undefined, { fallback: true, content_locale: "en", missing_count: 1 }, { fallback: false, content_locale: "fr", missing_count: 0 }, { fallback: false, content_locale: "pt-BR", missing_count: 1 }])("blocks absent, partial or foreign localization metadata: %j", (localization) => {
    expect(() => { assertContentLocale("/lessons/SUR-emergency-planning-L01", { localization }, "pt-BR"); }).toThrow("Content locale mismatch");
  });
  it("accepts fully localized metadata while leaving the English PDF artifact separate", () => {
    const data = { localization: { content_locale: "pt-BR", fallback: false, missing_count: 0, artifact_locale: "en" } };
    expect(() => { assertContentLocale("/resources/SUR-emergency-planning-R01", data, "pt-BR"); }).not.toThrow();
    expect(() => { assertContentLocale("/resources/SUR-emergency-planning-R01/download", {}, "pt-BR"); }).not.toThrow();
  });
  it("does not interfere with English, authentication, scoring-only attempt creation or user posts", () => {
    for (const path of ["/auth/me", "/quizzes/Q01/attempts", "/community/posts", "/lessons/L01/complete"]) expect(() => { assertContentLocale(path, {}, "de"); }).not.toThrow();
    expect(() => { assertContentLocale("/lessons/L01", {}, "en"); }).not.toThrow();
  });
  it("gives users a localized retry message instead of exposing backend wording", async () => {
    await changeLocale("pt-BR");
    try { assertContentLocale("/quizzes/Q01/attempts/12", {}, "pt-BR"); }
    catch (error) { expect(describeError(error)).toMatchObject({ title: "Este conteúdo está temporariamente indisponível no seu idioma. Tente novamente em instantes.", retryable: true }); }
  });
});
