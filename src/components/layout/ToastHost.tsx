/**
 * Toast host (frontend spec §12.3): top-center on mobile, bottom-right
 * on desktop; polite/assertive live regions per tone.
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
        "pointer-events-auto flex min-w-64 max-w-sm items-start gap-2 rounded-lg border bg-bg-elevated p-3 shadow-e2",
        toneClasses[toast.tone],
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs text-text-secondary">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => { dismiss(toast.id); }}
        className="rounded p-1 text-text-secondary hover:text-text-primary"
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
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-4 md:bottom-4 md:items-end">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
