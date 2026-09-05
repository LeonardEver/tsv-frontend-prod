/**
 * Environment configuration (frontend spec §28).
 *
 * VITE_* variables are client-visible — NEVER put secrets here.
 * The build-time guards live in vite.config.ts (fail the build); this
 * runtime module just exposes typed, defaulted values and logs loudly in
 * development when a misconfiguration is detected.
 */

export const env = {
  /**
   * API origin prefix. "" = same-origin (production default: the API is
   * served behind the same Nginx host; the session cookie is Path=/api).
   * Example: "https://api.example.com" for a cross-origin deployment.
   */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL) ?? "",

  /**
   * Stripe PUBLISHABLE key (pk_test_… — safe for browsers). When
   * missing, the billing UI degrades to the honest "billing not
   * configured" state instead of mounting a broken checkout.
   */
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
    | string
    | undefined,

  /** Dev-only contract check (silent in production builds). */
  contractCheck:
    !import.meta.env.PROD &&
    (import.meta.env.VITE_CONTRACT_CHECK) !== "0",

  isProduction: import.meta.env.PROD,
} as const;

/** True when embedded checkout can be mounted (key + backend config). */
export function isBillingEnabled(): boolean {
  return typeof env.stripePublishableKey === "string" && env.stripePublishableKey.length > 0;
}

/** Full API base for request paths, e.g. "" + "/api/v1". */
export const API_BASE = `${env.apiBaseUrl}/api/v1`;

if (import.meta.env.DEV && env.apiBaseUrl !== "" && !env.apiBaseUrl.startsWith("http")) {
  // Guard: misconfigured base is caught here in dev (build guard covers CI).
  console.error(`[config] VITE_API_BASE_URL "${env.apiBaseUrl}" is not a valid origin.`);
}
