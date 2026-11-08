# Internationalization architecture assessment

The frontend is a React 19 / TypeScript / Vite SPA using React Router and TanStack Query. The backend is Fastify 5 with Knex and PostgreSQL. There is no application-wide i18n framework. Admin Analytics has an isolated English/Portuguese dictionary and device preference, which must be integrated rather than retained as a competing preference.

The profile API already persists `users.preferred_language`, defaulting to English, but the field does not affect rendering. Login, registration and Google OIDC use the same server session. Language choice belongs in those account-entry screens and the existing profile preference area. Both experience modes share authentication, content IDs and API clients.

Canonical interface locales are `en`, `pt-BR`, `es`, `fr`, `de`, `it`. Formatting locales are `en-US`, `pt-BR`, `es-ES`, `fr-FR`, `de-DE`, `it-IT`. Browser variants normalize to these supported languages. Resolution is confirmed account preference, explicit local choice, browser preferences, optional country suggestion, English. No geolocation service or location permission is required.

## Planned implementation

- One i18next/react-i18next instance with typed domain namespaces and bundled English fallback. Other locale bundles load before committing a language change.
- Explicit local language choice is device-scoped and contains no session or account data. Authenticated preference synchronizes through the existing profile model. A separate confirmation marker distinguishes the legacy English database default from a new user's explicit choice.
- Language-dependent content query keys include the locale. Requests send an explicit language header; changing language never changes entity IDs or resets learning/subscription state.
- Add normalized translation records keyed by entity type, canonical ID and locale, with canonical source fingerprints, content versions, review status and review metadata. Apply allowlisted translated fields only, preserving IDs, answer IDs, correct-answer checks and access gates.
- Offline export/import/audit commands preserve Markdown, links, placeholders and units. Stale, missing or unpublished instructional translations fall back to canonical English with explicit localization metadata.

## Compatibility risks and controls

- Existing profile values and saved admin-language preferences need migration without overriding an explicit account choice.
- The same cached category/module response cannot serve multiple languages. Locale-sensitive cache keys must change together with request headers.
- Quiz localization must translate question/answer text while preserving all validation IDs, attempts and scores.
- Content translations cannot silently mix reviewed and unreviewed instructional sections. Publish complete entity translations against a matching source hash, and flag safety-critical content for human review.
- Currency, Stripe price/product IDs, entitlements, progress and canonical English content remain unchanged.
- Additive migrations and response fields preserve old clients. Production migrations, publication and deployment are outside this implementation's authorization.

## Content inventory

The local source vault currently has 81 lesson Markdown files (about 1.17 MB) and 81 quiz Markdown files (about 0.80 MB), including any templates. The exact published content inventory and translation coverage will be reported by the workflow rather than inferred from file counts. Missing instructional translations will remain visible as English fallbacks; no locale will be reported complete until its audited content coverage supports that claim.

## References

Implementation follows the official [i18next TypeScript guide](https://www.i18next.com/overview/typescript) and [react-i18next integration guide](https://react.i18next.com/latest/using-with-hooks).
