/**
 * Toast host (frontend spec §12.3): top-center on mobile, bottom-right
 * on desktop; polite/assertive live regions per tone.
 *
 * The mobile offset clears the shell header, which is TWO rows tall on
 * small screens (brand row plus the XP/level row) — a fixed `top-16` put
 * toasts over its lower half. It also adds the safe-area inset so the
 * first toast is not tucked under a notch. Desktop keeps the original
 * bottom-right placement.
 */
import { useEffect } from "react";
import { X } from "lucide-react";
import { useUiStore, type Toast } from "@/stores/ui-store";
import { clsx } from "clsx";

const toneClasses: Record<Toast["tone"], string> = {
  info: "border-info-water/40",
  success: "border-success-pine/40",
  error: "border-danger-blood/40",
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    const t = setTimeout(() => { dismiss(toast.id); }, 6000);
    return () => { clearTimeout(t); };
  }, [toast.id, dismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={clsx(
        "pointer-events-auto flex w-full min-w-0 max-w-sm items-start gap-2 rounded-lg border bg-popover p-3 text-popover-foreground shadow-[var(--shadow-elevated)]",
        toneClasses[toast.tone],
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => { dismiss(toast.id); }}
        className="rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  );
}

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      className={clsx(
        "pointer-events-none fixed inset-x-0 z-[var(--z-toast)] flex flex-col items-center gap-2 px-4",
        // `top-auto` must be a class, not an inline style: an inline `top`
        // would outrank it and stretch the stack top-to-bottom on desktop.
        "top-[calc(env(safe-area-inset-top,0px)+6.75rem)] md:top-auto",
        "md:inset-x-auto md:right-4 md:bottom-4 md:items-end",
      )}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
