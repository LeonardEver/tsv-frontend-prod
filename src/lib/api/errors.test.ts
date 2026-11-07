import { describe, expect, it } from "vitest";
import { ApiError, normalizeApiError } from "./errors";

describe("normalizeApiError", () => {
  it("normalizes the canonical backend envelope", () => {
    const err = normalizeApiError(
      422,
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: [{ path: "answers.0.answer", message: "Invalid" }],
          request_id: "req_abc",
        },
      }),
      null,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details).toEqual([{ path: "answers.0.answer", message: "Invalid" }]);
    expect(err.requestId).toBe("req_abc");
  });

  it("falls back to REQUEST_ERROR for malformed bodies", () => {
    const err = normalizeApiError(500, "not json", null);
    expect(err.code).toBe("REQUEST_ERROR");
    expect(err.status).toBe(500);
    expect(err.requestId).toBeUndefined();
  });

  it("takes request_id from the X-Request-Id header when the body lacks it", () => {
    const err = normalizeApiError(
      429,
      JSON.stringify({ error: { code: "RATE_LIMITED", message: "Slow down" } }),
      "x-req-9",
      60,
    );
    expect(err.requestId).toBe("x-req-9");
    expect(err.retryAfterSec).toBe(60);
  });

  it("surfaces 401 with the backend code", () => {
    const err = normalizeApiError(
      401,
      JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
      null,
    );
    expect(err.status).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });
});
