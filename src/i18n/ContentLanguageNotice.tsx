import { Info } from "lucide-react";
import { LANGUAGE_NAMES } from "./config";
import { useLocale, useT } from "./index";

/** Instructional fallback disclosure; no language controls in learning flows. */
export function ContentLanguageNotice({ data }: { data: unknown }) {
  const locale = useLocale();
  const t = useT();
  if (locale === "en") return null;
  const metadata = data && typeof data === "object" && "localization" in data ? data.localization : null;
  if (metadata && typeof metadata === "object" && "fallback" in metadata && metadata.fallback === false) return null;
  const englishFile = metadata && typeof metadata === "object" && "artifact_locale" in metadata && metadata.artifact_locale === "en";
  return (
    <p role="note" className="my-4 flex items-start gap-2 rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{englishFile ? t("englishFileFallback") : t("englishFallback", { language: LANGUAGE_NAMES[locale] })}</span>
    </p>
  );
}
