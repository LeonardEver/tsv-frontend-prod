/**
 * Thin typed API client (frontend spec §7).
 *
 * - credentials: "include" on every request (HttpOnly session cookie)
 * - configurable base (same-origin by default; dev proxy keeps dev
 *   same-origin too)
 * - timeout via AbortController (10s reads / 20s mutations)
 * - GET retry with exponential backoff on network failure / 502/503/504;
 *   NO blind mutation retries (idempotent mutations pass their own
 *   Idempotency-Key)
 * - 429 surfaces Retry-After via ApiError.retryAfterSec
 * - every non-2xx normalizes into ApiError; request_id propagates from
 *   the error envelope or the X-Request-Id header
 *
 * NO business logic lives here — just transport + error normalization.
 */
import { API_BASE } from "../config/env";
import {
  ApiError,
  NetworkError,
  TimeoutError,
  normalizeApiError,
  RETRYABLE_STATUSES,
  type ClientError,
} from "./errors";

const READ_TIMEOUT_MS = 10_000;
const MUTATION_TIMEOUT_MS = 20_000;
const MAX_GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Client UUID for idempotent mutations (attempt creation, quiz submit). */
  idempotencyKey?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface RawResponse {
  status: number;
  bodyText: string;
  xRequestId: string | null;
  retryAfterSec: number | undefined;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const sec = Number(header);
  return Number.isFinite(sec) && sec >= 0 ? sec : undefined;
}

async function doFetch(path: string, options: RequestOptions, timeoutMs: number): Promise<RawResponse> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  // Timeout via Promise.race, NOT via an AbortController:
  // - the caller's AbortSignal passes through to fetch unchanged (real
  //   cancellation, realm-correct)
  // - our own controller would be created in the CALLER's realm; Node 24's
  //   fetch (undici) strictly rejects foreign AbortSignals (verified in
  //   CI with the jsdom test environment).
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { reject(new TimeoutError(timeoutMs)); }, timeoutMs);
  });

  const requestPromise = (async (): Promise<RawResponse> => {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: options.method ?? "GET",
        credentials: "include",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });

      const bodyText = await res.text();
      return {
        status: res.status,
        bodyText,
        xRequestId: res.headers.get("x-request-id"),
        retryAfterSec: parseRetryAfter(res.headers.get("retry-after")),
      };
    } catch (err) {
      if (isAbortError(err)) {
        // Caller cancellation — rethrow as-is (callers distinguish it).
        throw new DOMException("Aborted", "AbortError");
      }
      throw new NetworkError(
        err instanceof Error ? err.message : "Network request failed",
      );
    }
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
    // If the timeout won the race, the request still settles later —
    // swallow its outcome so it never surfaces as an unhandled rejection.
    void requestPromise.catch(() => {});
  }
}

/**
 * Perform one request with retry policy applied for idempotent GETs only.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const isRead = method === "GET";
  const timeoutMs = options.timeoutMs ?? (isRead ? READ_TIMEOUT_MS : MUTATION_TIMEOUT_MS);

  let lastError: ClientError | null = null;
  const attempts = isRead ? MAX_GET_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    let raw: RawResponse;
    try {
      raw = await doFetch(path, options, timeoutMs);
    } catch (err) {
      lastError = err instanceof Error ? normalizeThrow(err) : new NetworkError("Request failed");
      if (attempt < attempts - 1 && isRetryable(lastError)) {
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + jitter(), options.signal);
        continue;
      }
      throw lastError;
    }

    if (raw.status >= 200 && raw.status < 300) {
      return parseBody(raw) as T;
    }

    const apiError = normalizeApiError(raw.status, raw.bodyText, raw.xRequestId, raw.retryAfterSec);
    if (attempt < attempts - 1 && isRetryable(apiError)) {
      lastError = apiError;
      await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + jitter(), options.signal);
      continue;
    }
    throw apiError;
  }

  throw lastError ?? new NetworkError("Request failed");
}

function normalizeThrow(err: Error): ClientError {
  if (err instanceof ApiError || err instanceof TimeoutError) return err;
  if (isAbortError(err)) return err as unknown as ClientError;
  return new NetworkError(err.message);
}

function isRetryable(err: ClientError): boolean {
  if (err instanceof TimeoutError) return false;
  if (err instanceof NetworkError) return true;
  return RETRYABLE_STATUSES.has(err.status);
}

function jitter(): number {
  return Math.floor(Math.random() * 80);
}

function parseBody(raw: RawResponse): unknown {
  if (raw.bodyText === "") return undefined;
  try {
    return JSON.parse(raw.bodyText) as unknown;
  } catch {
    // Should not happen for 2xx JSON endpoints; surface as a network-style
    // error rather than crashing the caller with a parse exception.
    throw new NetworkError("Invalid JSON response");
  }
}
