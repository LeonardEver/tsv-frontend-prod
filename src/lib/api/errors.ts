/**
 * API error model (frontend spec §25).
 *
 * Normalizes the backend's canonical error envelope
 *   { error: { code, message, details?, request_id? } }
 * into a single ApiError abstraction. Backend implementation details
 * (SQL, paths, stack traces) never surface: callers switch on `code`,
 * never on raw messages, and error UI maps codes to copy via
 * lib/api/error-map.
 */

export interface ApiErrorDetails {
  path?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly kind = "ApiError" as const;
  /** HTTP status (0 for network failures). */
  readonly status: number;
  /** Stable backend error code, e.g. "UNAUTHORIZED", "NOT_FOUND". */
  readonly code: string;
  /** Backend-provided human message (never rendered verbatim for 5xx). */
  readonly backendMessage: string | undefined;
  /** Field-level details for VALIDATION_ERROR etc. */
  readonly details: ApiErrorDetails[];
  /** Backend request UUID for support correlation. */
  readonly requestId: string | undefined;
  /** Retry-After seconds when the backend rate-limited us (429). */
  readonly retryAfterSec: number | undefined;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    backendMessage?: string;
    details?: ApiErrorDetails[];
    requestId?: string;
    retryAfterSec?: number;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.backendMessage = init.backendMessage;
    this.details = init.details ?? [];
    this.requestId = init.requestId;
    this.retryAfterSec = init.retryAfterSec;
  }
}

export class NetworkError extends Error {
  readonly kind = "NetworkError" as const;
  readonly requestId: string | undefined;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = "NetworkError";
    this.requestId = requestId;
  }
}

export class TimeoutError extends Error {
  readonly kind = "TimeoutError" as const;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

export type ClientError = ApiError | NetworkError | TimeoutError;

interface RawErrorEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    request_id?: unknown;
  };
}

function parseDetails(raw: unknown): ApiErrorDetails[] {
  if (!Array.isArray(raw)) return [];
  const out: ApiErrorDetails[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    out.push({
      path: typeof rec.path === "string" ? rec.path : undefined,
      message: typeof rec.message === "string" ? rec.message : undefined,
    });
  }
  return out;
}

/**
 * Normalize any backend response into an ApiError.
 * - Malformed bodies → REQUEST_ERROR with the status preserved.
 * - request_id falls back to the X-Request-Id response header.
 */
export function normalizeApiError(
  status: number,
  bodyText: string,
  xRequestId: string | null,
  retryAfterSec?: number,
): ApiError {
  let envelope: RawErrorEnvelope | null = null;
  try {
    envelope = JSON.parse(bodyText) as RawErrorEnvelope;
  } catch {
    envelope = null;
  }

  const err = envelope?.error ?? {};
  const code = typeof err.code === "string" && err.code.length > 0 ? err.code : "REQUEST_ERROR";
  const backendMessage = typeof err.message === "string" ? err.message : undefined;
  const requestId =
    typeof err.request_id === "string" && err.request_id.length > 0
      ? err.request_id
      : (xRequestId ?? undefined);

  return new ApiError({
    status,
    code,
    message: backendMessage ?? `Request failed with status ${status}`,
    backendMessage,
    details: parseDetails(err.details),
    requestId,
    retryAfterSec,
  });
}

/** HTTP statuses the GET-retry policy will retry (spec §7.1). */
export const RETRYABLE_STATUSES = new Set([502, 503, 504]);
