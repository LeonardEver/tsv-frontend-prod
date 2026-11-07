/**
 * Brand mark (Phase 23) — faithful port of the Lovable reference
 * `src/components/brand/BrandMark.tsx`. Legible from 16px up.
 */
import { cn } from "@/components/sa/primitives";

/** VISUAL — Survival Academy brand mark. */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Survival Academy"
      className={cn("size-8", className)}
    >
      <path
        d="M16 3.5 28.5 26H3.5L16 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M11.2 18.5h9.6L16 10l-4.8 8.5Z" fill="var(--ember)" />
      <path d="M7 26h18" stroke="var(--ember)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandGlyph className="size-7 shrink-0 text-foreground" />
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className="block font-display text-[15px] font-semibold tracking-[0.22em] uppercase">
            Survival
          </span>
          <span className="block font-mono text-[9px] tracking-[0.42em] text-muted-foreground uppercase">
            Academy
          </span>
        </span>
      )}
    </span>
  );
}
