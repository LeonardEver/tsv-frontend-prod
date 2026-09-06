import { describe, it, expect, afterEach, vi } from "vitest";
import worker from "./worker";

/**
 * Cloudflare Worker API proxy tests.
 *
 * Focus: verified client-IP forwarding (CF-Connecting-IP replaces the
 * untrusted client X-Forwarded-For chain) and header fidelity — cookie,
 * authorization, set-cookie and hop-by-hop header handling.
 */

const ORIGIN = "https://tsv-backend-prod-production.up.railway.app";

const CF_CONNECTING_IP = "203.0.113.7";

function upstreamHeadersWithSetCookies(): Headers {
  const headers = new Headers();
  headers.set("location", "https://survivalacademy.online/dashboard");
  headers.set("content-type", "application/json; charset=utf-8");
  headers.append("set-cookie", "session_id=abc-123; HttpOnly; Path=/api");
  headers.append("set-cookie", "theme=dark; Path=/");
  return headers;
}

/**
 * Read a Headers object into a plain record VIA ITERATION.
 *
 * Deliberately not `new Headers(init.headers)`: jsdom's Headers
 * constructor drops entries when copying a Headers instance that was
 * filled from a cross-implementation init (pre-existing jsdom bug —
 * iteration is unaffected; workerd's Headers is spec-correct).
 */
function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [name, value] of headers) {
    if (!(name in record)) record[name] = value;
  }
  return record;
}

describe("Cloudflare Worker API proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function callWorker(
    path: string,
    init?: RequestInit,
    env: Record<string, string | undefined> = { API_ORIGIN: ORIGIN },
  ): Promise<Response> {
    return worker.fetch(
      new Request(`https://survivalacademy.online${path}`, init),
      env as unknown as Parameters<typeof worker.fetch>[1],
    );
  }

  function stubFetch(status = 200, headers?: Headers): ReturnType<typeof vi.fn> {
    const mock = vi.fn(() => new Response("upstream body", { status, headers }));
    vi.stubGlobal("fetch", mock);
    return mock;
  }

  function upstreamRequest(mock: ReturnType<typeof vi.fn>): {
    url: string;
    init: RequestInit;
    headers: Record<string, string>;
  } {
    const [url, init] = mock.mock.calls[0] as [string, RequestInit];
    return { url, init, headers: headersToRecord(init.headers as Headers) };
  }

  it("replaces the client X-Forwarded-For with CF-Connecting-IP (never appends)", async () => {
    const mock = stubFetch();
    await callWorker("/api/v1/auth/me", {
      headers: {
        "cf-connecting-ip": CF_CONNECTING_IP,
        "x-forwarded-for": "6.6.6.6, 10.0.0.1",
        cookie: "session_id=abc-123",
      },
    });

    const { headers } = upstreamRequest(mock);
    expect(headers["x-forwarded-for"]).toBe(CF_CONNECTING_IP);
    expect(headers["x-forwarded-for"]).not.toContain("6.6.6.6");
    expect(headers["cookie"]).toBe("session_id=abc-123");
  });

  it("drops a client-supplied X-Forwarded-For when CF-Connecting-IP is absent", async () => {
    const mock = stubFetch();
    await callWorker("/api/v1/auth/me", {
      headers: { "x-forwarded-for": "6.6.6.6" },
    });

    const { headers } = upstreamRequest(mock);
    expect(headers["x-forwarded-for"]).toBeUndefined();
  });

  it("preserves method, query string, cookie, authorization and content-type headers", async () => {
    const mock = stubFetch();
    await callWorker("/api/v1/auth/login?redirect_to=%2Fdashboard", {
      method: "POST",
      headers: {
        "cf-connecting-ip": CF_CONNECTING_IP,
        "content-type": "application/json",
        cookie: "session_id=abc-123",
        authorization: "Bearer token-123",
      },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const { url, init, headers } = upstreamRequest(mock);
    expect(url).toBe(`${ORIGIN}/api/v1/auth/login?redirect_to=%2Fdashboard`);
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("manual");
    expect(headers["cookie"]).toBe("session_id=abc-123");
    expect(headers["authorization"]).toBe("Bearer token-123");
    expect(headers["content-type"]).toBe("application/json");
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(
      JSON.stringify({ email: "user@example.com" }),
    );
  });

  it("does not send a body for GET requests", async () => {
    const mock = stubFetch();
    await callWorker("/api/v1/modules", {
      method: "GET",
      headers: { "cf-connecting-ip": CF_CONNECTING_IP },
    });

    const { init } = upstreamRequest(mock);
    expect(init.body).toBeUndefined();
  });

  it("forwards multiple Set-Cookie headers untouched", async () => {
    const upstream = upstreamHeadersWithSetCookies();
    stubFetch(302, upstream);

    const res = await callWorker("/api/v1/auth/callback?code=x&state=y");

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://survivalacademy.online/dashboard",
    );
    expect(res.headers.getSetCookie()).toEqual([
      "session_id=abc-123; HttpOnly; Path=/api",
      "theme=dark; Path=/",
    ]);
  });

  it("strips content-encoding and content-length from the proxied response", async () => {
    const upstream = new Headers({ "content-type": "application/json" });
    stubFetch(200, upstream);

    const res = await callWorker("/api/v1/auth/me", {
      headers: { "cf-connecting-ip": CF_CONNECTING_IP },
    });

    expect(res.headers.get("content-encoding")).toBeNull();
    expect(res.headers.get("content-length")).toBeNull();
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(await res.text()).toBe("upstream body");
  });

  it("refuses to proxy non-/api paths", async () => {
    const mock = stubFetch();
    const res = await callWorker("/dashboard");
    expect(res.status).toBe(404);
    expect(mock).not.toHaveBeenCalled();
  });

  it("answers 500 when API_ORIGIN is not configured", async () => {
    const mock = stubFetch();
    const res = await callWorker("/api/v1/auth/me", undefined, {
      API_ORIGIN: undefined,
    });
    expect(res.status).toBe(500);
    expect(mock).not.toHaveBeenCalled();
  });
});
