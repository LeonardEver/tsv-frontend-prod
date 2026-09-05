/**
 * Canonical content ID validation (frontend spec §21, threat #17).
 *
 * Backend canonical IDs look like WAT-boiling-L01 ({CAT}-{slug}-{TYPE}{NN}).
 * Route params are validated against this shape BEFORE any request is
 * fired — malformed params render the 404 boundary instead of hitting
 * the API.
 */
const CANONICAL_ID_RE = /^[A-Z]{3}-[a-z][a-z0-9-]*[a-z0-9]-[KLQR]\d{2}$/;

export function isValidCanonicalId(id: string): boolean {
  return CANONICAL_ID_RE.test(id);
}
