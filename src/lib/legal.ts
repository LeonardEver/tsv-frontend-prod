/**
 * Published legal document versions (spec §29).
 *
 * Registration sends the version the user was SHOWN; the backend rejects
 * acceptance of outdated versions. These constants must match the
 * backend's TERMS_VERSION / PRIVACY_VERSION and are bumped together with
 * the documents in src/features/legal/.
 */
export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";

/** Effective date of the current published versions. */
export const LEGAL_EFFECTIVE_DATE = "September 5, 2026";
