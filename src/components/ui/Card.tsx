/**
 * Card (Phase 24) — the structural base of the surface system.
 * Visual treatment comes from the surface-* classes in tokens.css;
 * this component owns radius, border and padding so densities stay
 * consistent app-wide.
 */
import type { HTMLAttributes } from "react";
import { clsx } from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-border-default bg-bg-surface p-4 shadow-e1",
        className,
      )}
      {...props}
    />
  );
}
