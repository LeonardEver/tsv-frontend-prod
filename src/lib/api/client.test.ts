import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { request } from "./client";
import { ApiError } from "./errors";

const API = "*/api/v1";

describe("API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends credentials: include and parses JSON", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    server.use(
      http.get(`${API}/ping`, () => HttpResponse.json({ pong: true })),
    );
    const body = await request<{ pong: boolean }>("/ping");
    expect(body.pong).toBe(true);
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.credentials).toBe("include");
  });

  it("retries idempotent GETs on 503, then succeeds", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/flaky`, () => {
        calls++;
        if (calls < 3) {
          return HttpResponse.json(
            { error: { code: "REQUEST_ERROR", message: "unavailable" } },
            { status: 503 },
          );
        }
        return HttpResponse.json({ ok: true });
      }),
    );
    const body = await request<{ ok: boolean }>("/flaky");
    expect(body.ok).toBe(true);
    expect(calls).toBe(3);
  });

  it("does NOT retry mutations", async () => {
    let calls = 0;
    server.use(
      http.post(`${API}/mutate`, () => {
        calls++;
        return HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "boom" } },
          { status: 500 },
        );
      }),
    );
    await expect(request("/mutate", { method: "POST" })).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(1);
  });

  it("normalizes 401 into ApiError with the backend code", async () => {
    server.use(
      http.get(`${API}/forbidden-zone`, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: "r-1" } },
          { status: 401 },
        ),
      ),
    );
    await expect(request("/forbidden-zone")).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHORIZED",
      requestId: "r-1",
    });
  });

  it("surfaces Retry-After on 429", async () => {
    server.use(
      http.get(`${API}/rate-limited`, () =>
        HttpResponse.json(
          { error: { code: "RATE_LIMITED", message: "Too many requests" } },
          { status: 429, headers: { "Retry-After": "42" } },
        ),
      ),
    );
    await expect(request("/rate-limited")).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      retryAfterSec: 42,
    });
  });
});
