/**
 * Compact language switch for the admin analytics console.
 *
 * Two segmented buttons, styled with the same border/active recipe as the
 * section tab strip so it reads as part of the surface rather than as a
 * new control family. Presentational only: the choice itself lives in
 * `language.ts`, which persists it, so navigating between sections or
 * reloading the page keeps the selection.
 *
 * The accessible name is the console's current language, so it flips from
 * "Language" to "Idioma" with the rest of the copy.
 */
import { cn } from "@/components/sa/primitives";
import { useTr } from "./i18n";
import { ADMIN_LANGUAGES, setAdminLanguage, useAdminLanguage } from "./language";
import type { AdminLanguage } from "./language";

/** Displayed as-is in both languages — a language is named in itself. */
const CODES: Record<AdminLanguage, string> = { en: "EN", pt: "PT" };

export function LanguageToggle() {
  const { t } = useTr();
  const language = useAdminLanguage();

  return (
    <div
      role="group"
      aria-label={t("toggle.label")}
      className="inline-flex overflow-hidden rounded-lg border border-border bg-surface-2/70"
    >
      {ADMIN_LANGUAGES.map((code) => {
        const active = language === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => {
              setAdminLanguage(code);
            }}
            title={code === "en" ? t("toggle.english") : t("toggle.portuguese")}
            aria-pressed={active}
            className={cn(
              "h-8 min-w-9 px-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors",
              active
                ? "bg-primary/12 font-semibold text-primary"
                : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
            )}
          >
            {CODES[code]}
          </button>
        );
      })}
    </div>
  );
}
