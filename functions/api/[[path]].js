/**
 * Cloudflare Pages Function — API proxy for the Survival Academy SPA.
 *
 * Proxies /api/* to the backend origin so the app keeps the same-origin
 * topology it is designed for (session cookie: HttpOnly, Secure,
 * SameSite=Lax, Path=/api). Without this, Pages would serve the SPA
 * fallback (index.html) for /api requests and auth would break.
 *
 * Requires the Pages environment variable API_ORIGIN, e.g.
 * https://backend.up.railway.app (no trailing slash).
 */
export const onRequest = async ({ request, env }) => {
  const origin = env.API_ORIGIN;
  if (!origin) {
    return new Response("API_ORIGIN not configured", { status: 500 });
  }

  const url = new URL(request.url);
  const init = {
    method: request.method,
    headers: request.headers,
    redirect: "manual", // let 302s (OIDC/Stripe) pass through as-is
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(`${origin}${url.pathname}${url.search}`, init);

  const headers = new Headers(res.headers);
  // The runtime transparently decompresses fetch bodies, so forwarding
  // content-encoding would describe a body that is no longer encoded;
  // Cloudflare re-compresses the response on egress.
  headers.delete("content-encoding");
  headers.delete("content-length");

  // Set-Cookie passes through untouched — session cookie must reach the
  // browser with the Pages origin as its host.
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};