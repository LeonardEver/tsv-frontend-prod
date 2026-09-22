/**
 * DropdownMenu (design system §12.3) — Radix wrapper with WAI-ARIA menu
 * keyboard semantics (arrows, Home/End, typeahead, ESC).
 *
 * Mobile containment. Radix portals this content to <body>, so it is
 * outside the shell's stacking context — without an explicit layer it sits
 * at z-auto and the fixed bottom navigation (z-nav) paints over it. It
 * carries the popover layer for that reason, not because a value "looked
 * too low".
 *
 * `collisionPadding` keeps the menu off the viewport edge instead of
 * flush against it, and the max-height is Radix's own computed available
 * height, so a long menu scrolls inside the viewport rather than
 * overflowing it. `align="end"` still anchors to the trigger's trailing
 * edge, which is where the account button lives.
 */
import type { ReactNode } from "react";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { clsx } from "clsx";

/** Distance kept between the menu and the viewport edge, in px. */
const VIEWPORT_MARGIN = 12;

export function DropdownMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <RadixMenu.Root>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={VIEWPORT_MARGIN}
          className={clsx(
            "z-[var(--z-popover)] min-w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-elevated)]",
            // Scroll inside the viewport rather than growing past it.
            "max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto",
            "overscroll-contain",
          )}
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
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground",
        "outline-none hover:bg-accent focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
    >
      {children}
    </RadixMenu.Item>
  );
}

export function DropdownMenuSeparator() {
  return <RadixMenu.Separator className="my-1 h-px bg-border" />;
}
