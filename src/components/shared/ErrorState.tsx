/**
 * Reusable error state UI. Copy comes from lib/api/error-map (spec §25);
 * request_id is the only backend passthrough.
 *
 * `explain` / `labels` exist for the admin analytics console, the one
 * locale-aware surface in the app: its caller supplies translated copy for
 * the same backend `code`. Omitted — as it is on every public route — the
 * component behaves exactly as before.
 */
import { ApiError } from "@/lib/api/errors";
import { describeError, type ErrorCopy } from "@/lib/api/error-map";

export function ErrorState({
  error,
  onRetry,
  explain = describeError,
  labels,
}: {
  error: unknown;
  onRetry?: (() => void) | undefined;
  explain?: ((error: unknown) => ErrorCopy) | undefined;
  labels?: { retry: string; reference: string } | undefined;
}) {
  const copy = explain(error);
  const requestId =
    error instanceof ApiError ? error.requestId : undefined;

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-blood/40 bg-danger-blood/5 p-6">
      <p className="font-semibold">{copy.title}</p>
      {copy.description ? <p className="text-sm text-text-secondary">{copy.description}</p> : null}
      {copy.retryable && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-accent-ember px-4 py-2 text-sm font-semibold text-accent-on hover:bg-accent-ember-hover"
        >
          {labels?.retry ?? "Retry"}
        </button>
      ) : null}
      {requestId ? (
        <p className="text-xs text-text-disabled">{labels?.reference ?? "Reference:"} {requestId}</p>
      ) : null}
    </div>
  );
}
