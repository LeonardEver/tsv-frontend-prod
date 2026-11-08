import { useSyncExternalStore } from "react";
import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import english from "./locales/en";
import { DEFAULT_LOCALE, FORMATTING_LOCALES, normalizeLocale, resolveLocale, SUPPORTED_LOCALES, type Locale } from "./config";

export const i18n = i18next.createInstance();
void i18n.use({
  type: "formatter",
  init() { /* Intl is available in every supported browser. */ },
  format(value: unknown, _format: string | undefined, language: string | undefined) {
    return typeof value === "number"
      ? new Intl.NumberFormat(FORMATTING_LOCALES[normalizeLocale(language) ?? DEFAULT_LOCALE]).format(value)
      : String(value);
  },
}).use(initReactI18next).init({
  lng: DEFAULT_LOCALE, fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES], load: "currentOnly",
  defaultNS: "common", ns: Object.keys(english), keySeparator: false,
  resources: { en: english }, initAsync: false, returnNull: false,
  interpolation: {
    escapeValue: false,
    alwaysFormat: true,
  },
  react: { useSuspense: false },
});

const loaders = {
  "pt-BR": () => import("./locales/pt-BR"),
  es: () => import("./locales/es"), fr: () => import("./locales/fr"),
  de: () => import("./locales/de"), it: () => import("./locales/it"),
};
const loaded = new Set<Locale>(["en"]);
const pendingLoads = new Map<Locale, Promise<void>>();
let changeVersion = 0;

export function getLocale(): Locale {
  return normalizeLocale(i18n.resolvedLanguage ?? i18n.language) ?? DEFAULT_LOCALE;
}

export function formattingLocale(): string { return FORMATTING_LOCALES[getLocale()]; }

export function explicitLocale(): Locale | null {
  try {
    return normalizeLocale(localStorage.getItem("survival-academy-language"))
      ?? normalizeLocale(localStorage.getItem("admin-analytics-lang"));
  }
  catch { return null; }
}

export async function loadLocale(locale: Locale): Promise<void> {
  if (loaded.has(locale)) return;
  const existing = pendingLoads.get(locale);
  if (existing) return existing;
  if (locale === "en") return;
  const promise = loaders[locale]().then(({ default: resources }) => {
    for (const [namespace, entries] of Object.entries(resources)) {
      i18n.addResourceBundle(locale, namespace, entries, true, true);
    }
    loaded.add(locale);
  }).finally(() => { pendingLoads.delete(locale); });
  pendingLoads.set(locale, promise);
  return promise;
}

export async function changeLocale(locale: Locale, options: { explicit?: boolean } = {}): Promise<void> {
  const version = ++changeVersion;
  await loadLocale(locale);
  if (version !== changeVersion) return;
  await i18n.changeLanguage(locale);
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  if (options.explicit) confirmLocaleChoice(locale);
}

/** Synchronous persistence before OAuth's full-page navigation. */
export function confirmLocaleChoice(locale: Locale = getLocale()): void {
  try { localStorage.setItem("survival-academy-language", locale); } catch { /* Storage is optional. */ }
}

export async function initializeLocale(): Promise<void> {
  const choice = resolveLocale({
    explicit: explicitLocale(),
    browsers: typeof navigator === "undefined" ? [] : navigator.languages,
  });
  await changeLocale(choice.locale);
}

function subscribe(listener: () => void): () => void {
  i18n.on("languageChanged", listener);
  return () => { i18n.off("languageChanged", listener); };
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => DEFAULT_LOCALE);
}

export function useT() { return useTranslation().t; }
export const tr = i18n.t.bind(i18n);

/** Match React's primitive-child rendering for interpolated UI fragments. */
export function uiValue(value: unknown): string | number {
  return typeof value === "string" || typeof value === "number" ? value : "";
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== "survival-academy-language") return;
    const locale = normalizeLocale(event.newValue);
    if (locale) void changeLocale(locale);
  });
}
