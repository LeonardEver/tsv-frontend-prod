import { LANGUAGE_NAMES, SUPPORTED_LOCALES, type Locale } from "./config";
import { useLocale, useT } from "./index";

export function LanguageSelector({ id = "interface-language", value, onChange, disabled = false, help = false }: {
  id?: string; value?: Locale; onChange: (locale: Locale) => void; disabled?: boolean; help?: boolean;
}) {
  const locale = useLocale();
  const t = useT();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{t("language")}</label>
      <select id={id} value={value ?? locale} disabled={disabled}
        className="min-h-11 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        onChange={(event) => { onChange(event.target.value as Locale); }}
        aria-describedby={help ? `${id}-help` : undefined}>
        {SUPPORTED_LOCALES.map((code) => <option key={code} value={code} lang={code}>{LANGUAGE_NAMES[code]}</option>)}
      </select>
      {help && <p id={`${id}-help`} className="text-xs text-muted-foreground">{t("languageHelp")}</p>}
    </div>
  );
}
