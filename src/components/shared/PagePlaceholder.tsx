/**
 * Placeholder page for foundation routes (Phase 10 scope guard).
 * Feature phases replace each of these with the real screen; until then
 * the route map, shell and guards are exercisable end-to-end.
 */
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function PagePlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl">{title}</h1>
        <Badge tone="neutral">Phase 11+</Badge>
      </div>
      <Card>
        <p className="text-text-secondary">
          {note ?? `The ${title.toLowerCase()} experience arrives in the feature phases.`}
        </p>
      </Card>
    </div>
  );
}
