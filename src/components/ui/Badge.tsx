/**
 * Badge (design system §12.3). Tonal variants — status is never
 * communicated by color alone (icon/text always accompany).
 */
import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "success" | "info" | "warning" | "danger";
}

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-bg-elevated text-text-secondary",
  success: "bg-success-pine/15 text-success-pine",
  info: "bg-info-water/15 text-info-water",
  warning: "bg-warning-amber/15 text-warning-amber",
  danger: "bg-danger-blood/15 text-danger-blood",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
