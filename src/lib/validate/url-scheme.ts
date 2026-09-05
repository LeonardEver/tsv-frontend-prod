/**
 * URL scheme allowlist for content rendering (frontend spec §22, §21 #10).
 *
 * Content from the API is treated as untrusted: link/image destinations
 * are restricted to safe schemes at render time, independent of backend
 * sanitization (defense in depth).
 */
const ALLOWED_SCHEMES = new Set(["http:", "https:", "mailto:"]);

export function isSafeUrl(value: string): boolean {
  if (value.startsWith("/") || value.startsWith("#") || value.startsWith("./") || value.startsWith("../")) {
    return true; // relative
  }
  try {
    const parsed = new URL(value);
    return ALLOWED_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

/** Returns the URL when safe, otherwise undefined (link is dropped). */
export function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return isSafeUrl(value) ? value : undefined;
}
