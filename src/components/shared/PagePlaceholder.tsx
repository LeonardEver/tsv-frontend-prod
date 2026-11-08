/**
 * Placeholder page for foundation routes (Phase 10 scope guard).
 * Feature phases replace each of these with the real screen; until then
 * the route map, shell and guards are exercisable end-to-end.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function PagePlaceholder({ title, note }: { title: string; note?: string }) {
  useInterfaceLocale();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl">{title}</h1>
        <Badge tone="neutral">{uiText("common:phase_11_9cc60e")}</Badge>
      </div>
      <Card>
        <p className="text-text-secondary">
          {note ?? uiText("common:the_value_experience_arrives_in_the_feature_868451", { value0: uiValue(title.toLowerCase()) })}
        </p>
      </Card>
    </div>
  );
}
