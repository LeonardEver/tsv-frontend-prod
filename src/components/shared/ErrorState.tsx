/**
 * Reusable error state UI. Copy comes from lib/api/error-map (spec §25);
 * request_id is the only backend passthrough.
 */
import { ApiError } from "@/lib/api/errors";
import { describeError } from "@/lib/api/error-map";

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const copy = describeError(error);
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
          Retry
        </button>
      ) : null}
      {requestId ? (
        <p className="text-xs text-text-disabled">Reference: {requestId}</p>
      ) : null}
    </div>
  );
}
