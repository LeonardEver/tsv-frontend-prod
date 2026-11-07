/**
 * Cloudflare Worker — API proxy for the Survival Academy SPA.
 *
 * Proxies /api/* to the backend origin so the app keeps the same-origin
 * topology it is designed for (session cookie: HttpOnly, Secure,
 * SameSite=Lax, Path=/api). With assets.run_worker_first (["/api/*"]) the
 * Worker runs before asset lookup for API routes only; every other
 * request is served by the static assets, with SPA deep-link fallback
 * handled by assets.not_found_handling.
 *
 * Requires the Worker variable API_ORIGIN, e.g.
 * https://backend.up.railway.app (no trailing slash). Configured in the
 * dashboard (or .dev.vars for local `wrangler dev`).
 */
export interface Env {
  API_ORIGIN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only /api/* reaches this Worker (run_worker_first), but guard
    // anyway: non-API requests must never be proxied.
    if (!url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    const origin = env.API_ORIGIN;
    if (!origin) {
      return new Response("API_ORIGIN not configured", { status: 500 });
    }

    // Forward the verified client IP. CF-Connecting-IP is set by the
    // Cloudflare edge for every request and cannot be spoofed by the
    // client; the client-supplied X-Forwarded-For chain is untrusted.
    // The backend runs with trustProxy and reads the leftmost
    // X-Forwarded-For entry for per-IP rate limiting (and session
    // metadata) — replacing the header here (never appending) keeps a
    // spoofable chain from reaching it.
    const headers = new Headers(request.headers);
    headers.delete("x-forwarded-for");
    const clientIp = request.headers.get("cf-connecting-ip");
    if (clientIp) {
      headers.set("x-forwarded-for", clientIp);
    }

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual", // let 302s (OIDC/Stripe) pass through as-is
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    const res = await fetch(`${origin}${url.pathname}${url.search}`, init);

    const outHeaders = new Headers(res.headers);
    // The runtime transparently decompresses fetch bodies, so forwarding
    // content-encoding would describe a body that is no longer encoded;
    // Cloudflare re-compresses the response on egress.
    outHeaders.delete("content-encoding");
    outHeaders.delete("content-length");

    // Set-Cookie passes through untouched — session cookie must reach the
    // browser with the Worker origin as its host.
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  },
};
