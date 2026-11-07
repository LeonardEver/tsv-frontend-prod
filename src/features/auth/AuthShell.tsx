/**
 * Shared split-screen shell for the credential auth screens
 * (register / verify / forgot / reset). Left: the branded `topo` +
 * `grain` panel (same visual language as LoginScreen). Right: a
 * scrollable form column. Children are placed in the right column.
 */
import type { ReactNode } from "react";
import { BrandMark } from "@/components/layout/BrandMark";
import { Eyebrow } from "@/components/sa/primitives";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="topo grain relative flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-16">
        <ThemeToggle className="absolute top-4 right-4 z-10" />

        <div className="relative w-full max-w-md">
          <BrandMark />
          <Eyebrow className="mt-12">Survival Academy</Eyebrow>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] font-semibold tracking-wide uppercase sm:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-start justify-center overflow-y-auto bg-bg-surface px-6 py-14 sm:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
