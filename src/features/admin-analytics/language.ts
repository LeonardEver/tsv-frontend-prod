/** Compatibility facade: analytics follows the same account locale as the rest of the app. */
import { changeLocale, getLocale, useLocale } from "@/i18n";
import { normalizeLocale, SUPPORTED_LOCALES, type Locale } from "@/i18n/config";

/** `pt` is accepted only for old helper callers; storage uses canonical pt-BR. */
export type AdminLanguage = Locale | "pt";
export const ADMIN_LANGUAGES = SUPPORTED_LOCALES;
export const DEFAULT_ADMIN_LANGUAGE: AdminLanguage = "en";
export function isAdminLanguage(value: unknown): value is AdminLanguage {
  return value === "pt" || SUPPORTED_LOCALES.some((locale) => locale === value);
}
export function getAdminLanguage(): AdminLanguage { return getLocale(); }
export function setAdminLanguage(language: AdminLanguage): Promise<void> {
  return changeLocale(normalizeLocale(language) ?? "en", { explicit: true });
}
export function __resetAdminLanguage(): Promise<void> { return changeLocale("en"); }
export function useAdminLanguage(): AdminLanguage { return useLocale(); }
