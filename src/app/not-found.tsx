import { PagePlaceholder } from "@/components/shared/PagePlaceholder";
import { tr, useLocale } from "@/i18n";

export function NotFoundPage() {
  useLocale();
  return <PagePlaceholder title={tr("common:not_found_475c84")} note={tr("common:this_page_doesn_t_exist_079f1f")} />;
}
