/**
 * DropdownMenu (design system §12.3) — Radix wrapper with WAI-ARIA menu
 * keyboard semantics (arrows, Home/End, typeahead, ESC).
 */
import type { ReactNode } from "react";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { clsx } from "clsx";

export function DropdownMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          align="end"
          sideOffset={8}
          className="min-w-44 rounded-lg border border-border-default bg-bg-elevated p-1 shadow-e2"
        >
          {children}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}

export function DropdownMenuItem({
  className,
  onSelect,
  children,
}: {
  className?: string;
  onSelect?: () => void;
  children: ReactNode;
}) {
  return (
    <RadixMenu.Item
      onSelect={onSelect}
      className={clsx(
        "flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary",
        "outline-none hover:bg-bg-surface focus:bg-bg-surface data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
    >
      {children}
    </RadixMenu.Item>
  );
}

export function DropdownMenuSeparator() {
  return <RadixMenu.Separator className="my-1 h-px bg-border-default" />;
}
