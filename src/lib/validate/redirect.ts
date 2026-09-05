/**
 * Root-relative redirect validation (frontend spec §21, threat #5).
 *
 * The backend's safeRedirect is authoritative for OIDC; the frontend
 * re-validates every destination it puts into `redirect_to` as defense
 * in depth. Only root-relative single-slash paths pass.
 */
export function isSafeRedirectPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\") &&
    !/^\/[^/]*\.\./.test(value)
  );
}

/** Returns the sanitized destination, or "/" when unsafe. */
export function safeRedirectPath(value: string | null | undefined): string {
  if (value && isSafeRedirectPath(value)) return value;
  return "/";
}
