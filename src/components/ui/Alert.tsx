/**
 * Alert (design system §12.3). Four tones; error tones are assertive
 * live regions, others polite.
 */
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { clsx } from "clsx";

export interface AlertProps {
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  children?: ReactNode;
}

const toneClasses: Record<AlertProps["tone"], { box: string; icon: ReactNode }> = {
  info: {
    box: "border-info-water/40 bg-info-water/10 text-text-primary",
    icon: <Info aria-hidden="true" className="size-5 shrink-0 text-info-water" />,
  },
  success: {
    box: "border-success-pine/40 bg-success-pine/10 text-text-primary",
    icon: <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success-pine" />,
  },
  warning: {
    box: "border-warning-amber/40 bg-warning-amber/10 text-text-primary",
    icon: <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-warning-amber" />,
  },
  danger: {
    box: "border-danger-blood/40 bg-danger-blood/10 text-text-primary",
    icon: <XCircle aria-hidden="true" className="size-5 shrink-0 text-danger-blood" />,
  },
};

export function Alert({ tone, title, children }: AlertProps) {
  const { box, icon } = toneClasses[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx("flex items-start gap-3 rounded-md border p-4", box)}
    >
      {icon}
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 text-sm text-text-secondary">{children}</div> : null}
      </div>
    </div>
  );
}
