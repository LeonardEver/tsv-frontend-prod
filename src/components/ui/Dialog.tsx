/**
 * Dialog (design system §12.3) — Radix wrapper: focus trap, aria-modal,
 * ESC, scroll lock, focus restore.
 *
 * Mobile containment. The dialog is centred with a translate, so a panel
 * taller than the viewport would put its own top and bottom off-screen
 * with nothing able to scroll to them — the embedded Stripe checkout and
 * the report/edit forms both exceed a 390×844 phone. The content is
 * therefore capped against the *dynamic* viewport (`dvh`, so a collapsing
 * browser toolbar cannot push the footer out of reach) and scrolls
 * internally, and the overlay/content carry explicit layers so the fixed
 * bottom navigation and toasts cannot paint through the modal.
 *
 * Safe-area padding keeps the close control clear of a notch and the
 * footer clear of the home indicator.
 */
import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { clsx } from "clsx";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/70 backdrop-blur-[2px]" />
        <RadixDialog.Content
          className={clsx(
            "fixed top-1/2 left-1/2 z-[var(--z-modal)] -translate-x-1/2 -translate-y-1/2",
            // 100dvh, not 100vw: the height budget is what matters here.
            "w-[calc(100vw-2rem)] max-w-md max-h-[calc(100dvh-2rem)]",
            "overflow-y-auto overscroll-contain",
            "rounded-xl border border-border bg-popover p-6 text-popover-foreground",
            "shadow-[var(--shadow-elevated)] focus-visible:outline-none",
            "px-[max(1.5rem,env(safe-area-inset-left))]",
          )}
        >
          <RadixDialog.Title className="pr-8 text-lg font-semibold">{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-1 text-sm text-muted-foreground">
              {description}
            </RadixDialog.Description>
          ) : null}
          <div className="mt-4">{children}</div>
          <RadixDialog.Close
            aria-label="Close dialog"
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
