export const SUPPORTED_LOCALES = ["en", "pt-BR", "es", "fr", "de", "it"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = {
  en: "English", "pt-BR": "Português (Brasil)", es: "Español",
  fr: "Français", de: "Deutsch", it: "Italiano",
};
export const FORMATTING_LOCALES: Readonly<Record<Locale, string>> = {
  en: "en-US", "pt-BR": "pt-BR", es: "es-ES",
  fr: "fr-FR", de: "de-DE", it: "it-IT",
};

/** Canonicalize aliases without treating country as nationality. */
export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string" || !/^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*$/.test(value.trim())) return null;
  const language = value.trim().replaceAll("_", "-").toLowerCase().split("-")[0];
  if (language === "pt") return "pt-BR";
  return SUPPORTED_LOCALES.find((locale) => locale === language) ?? null;
}

export function browserLocale(languages: readonly string[]): Locale | null {
  for (const language of languages) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }
  return null;
}

/** Optional recommendation only; no network request or IP storage. */
export function countrySuggestion(country: string | null | undefined): Locale | null {
  const recommendations: Record<string, Locale> = {
    BR: "pt-BR", PT: "pt-BR", ES: "es", MX: "es", AR: "es", CL: "es", CO: "es",
    FR: "fr", DE: "de", AT: "de", IT: "it", US: "en", GB: "en", AU: "en", NZ: "en",
  };
  return country ? recommendations[country.toUpperCase()] ?? null : null;
}

export function resolveLocale(input: {
  account?: unknown; explicit?: unknown; browsers?: readonly string[]; country?: string | null;
}): { locale: Locale; source: "account" | "local" | "browser" | "country" | "fallback" } {
  const account = normalizeLocale(input.account);
  if (account) return { locale: account, source: "account" };
  const local = normalizeLocale(input.explicit);
  if (local) return { locale: local, source: "local" };
  const browser = browserLocale(input.browsers ?? []);
  if (browser) return { locale: browser, source: "browser" };
  const country = countrySuggestion(input.country);
  if (country) return { locale: country, source: "country" };
  return { locale: DEFAULT_LOCALE, source: "fallback" };
}
