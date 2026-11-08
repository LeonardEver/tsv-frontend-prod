import { useState } from "react";
import { LanguageSelector } from "./LanguageSelector";
import { changeLocale, explicitLocale, useLocale, useT } from "./index";
import { LANGUAGE_NAMES } from "./config";

/** Account-entry control only; never mounted inside learning screens. */
export function AuthLanguageChoice() {
  const locale = useLocale();
  const t = useT();
  const [failed, setFailed] = useState(false);
  return (
    <div className="my-5 max-w-sm space-y-2">
      <LanguageSelector help onChange={(next) => {
        setFailed(false);
        void changeLocale(next, { explicit: true }).catch(() => { setFailed(true); });
      }} />
      {explicitLocale() === null && <p className="text-xs text-muted-foreground">{t("recommendedLanguage", { language: LANGUAGE_NAMES[locale] })}</p>}
      {failed && <p role="alert" className="text-xs text-destructive">{t("languageSaveFailed")}</p>}
    </div>
  );
}
