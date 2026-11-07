/**
 * Intentional empty state (frontend spec §24): icon, title, explanation
 * and an optional next action.
 */
import type { ReactNode } from "react";
import { Compass } from "lucide-react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon = <Compass aria-hidden="true" className="size-8 text-text-disabled" />,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-default p-8 text-center">
      {icon}
      <p className="font-semibold">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
