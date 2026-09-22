/**
 * Admin analytics display language.
 *
 * The Admin Product Analytics surface is the ONLY locale-aware area of the
 * app: everything else (landing, learn, community, billing) is English by
 * product decision, and this store never reaches it. The key is
 * device-scoped and carries no user data, exactly like `theme-pref` in
 * `stores/ui-store.ts`.
 *
 * A module-level store rather than a React context on purpose: the layout,
 * the shared chart primitives and every lazily-loaded tab all read the
 * same value, and a context would have to wrap each of the twelve lazy
 * route chunks to reach them. Navigation — tab to tab, or a full reload —
 * therefore keeps the choice with no plumbing.
 *
 * Default is English. A stored value is only honoured when it is exactly
 * "pt"; anything else (absent, corrupt, a future code) falls back to the
 * default rather than rendering an unknown locale.
 */
import { useSyncExternalStore } from "react";

export type AdminLanguage = "en" | "pt";

export const ADMIN_LANGUAGES: readonly AdminLanguage[] = ["en", "pt"];

export const DEFAULT_ADMIN_LANGUAGE: AdminLanguage = "en";

/** Device-scoped preference. Not user data, never sent to the backend. */
const STORAGE_KEY = "admin-analytics-lang";

export function isAdminLanguage(value: unknown): value is AdminLanguage {
  return value === "en" || value === "pt";
}

function readStoredLanguage(): AdminLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAdminLanguage(stored) ? stored : DEFAULT_ADMIN_LANGUAGE;
  } catch {
    return DEFAULT_ADMIN_LANGUAGE; // storage unavailable → default
  }
}

function persistLanguage(language: AdminLanguage): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // A storage failure never blocks the switch.
  }
}

let current: AdminLanguage =
  typeof window === "undefined" ? DEFAULT_ADMIN_LANGUAGE : readStoredLanguage();

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current language outside React (helpers that are not components). */
export function getAdminLanguage(): AdminLanguage {
  return current;
}

export function setAdminLanguage(language: AdminLanguage): void {
  if (language === current) return;
  current = language;
  persistLanguage(language);
  for (const listener of listeners) listener();
}

/** Another tab of the same console changed the preference. */
export function __syncAdminLanguage(event: Pick<StorageEvent, "key" | "newValue">): void {
  if (event.key !== STORAGE_KEY) return;
  const next = isAdminLanguage(event.newValue) ? event.newValue : DEFAULT_ADMIN_LANGUAGE;
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", __syncAdminLanguage);
}

/** Reset to (and persist) the default. Test-only: no UI path calls this. */
export function __resetAdminLanguage(): void {
  current = DEFAULT_ADMIN_LANGUAGE;
  persistLanguage(DEFAULT_ADMIN_LANGUAGE);
  for (const listener of listeners) listener();
}

export function useAdminLanguage(): AdminLanguage {
  return useSyncExternalStore(subscribe, getAdminLanguage, () => DEFAULT_ADMIN_LANGUAGE);
}
