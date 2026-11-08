# Validation — 2026-11-08

All database mutations described here used only the dedicated disposable PostgreSQL database `localhost:5434/survival_academy_i18n_test`. No development/production database migration, deployment, payment or real outbound email was performed.

| Check | Result |
| --- | --- |
| Frontend unit/component suite | 46 files, **355 tests passed** (`vitest run --maxWorkers=2`) |
| Backend unit suite | 10 files, **125 tests passed** |
| Backend integration suite | 20 files, **360 tests passed** |
| Full Playwright suite, Chromium + mobile Chromium + Firefox + WebKit | **452 passed, 31 project-specific skips, 1 failure** |
| Additional French/Italian profile expansion + lesson fallback browser checks | **8 passed** across the same four projects |
| Frontend TypeScript + production build | Passed |
| Backend TypeScript + build | Passed |
| Frontend lint | Zero errors; 5 existing Fast Refresh export warnings |
| Backend lint | Passed |
| OpenAPI export + frontend client generation | Passed; optional localization metadata included |
| UI catalog key/interpolation parity | All six locales; **1,786 / 1,786** keys each |
| Static UI source inventory | Zero remaining candidates under the audit heuristic |
| Five real instructional/metadata packs | **508 records validated per locale** against canonical source |
| Real local import and idempotent re-import | Passed; 497 authored metadata records + 11 drafts per locale |
| Before/after canonical/account/progress fingerprints | Identical across all checked tables |
| Real Fastify response checks for all five imported locales | Translated metadata, unchanged canonical IDs and hidden answers, explicit unreviewed-English fallback |
| Whitespace validation | `git diff --check` passed in frontend and backend |

Earlier integration failures exposed shared test fixtures leaking into another file's taxonomy assertions. The i18n fixture now cleans up its disposable rows after the test. The final complete integration run passed. Earlier unit timeouts under simultaneous multi-browser load were rerun with two Vitest workers; the final full unit suite passed without increasing application or test timeouts.

## Covered behavior

- Browser aliases and first-supported preference; country suggestion never overriding explicit account/local preference.
- Confirmed account locale held before protected content; explicit pre-login choice synchronized once; logout and fresh bootstrap preserve the choice.
- Germany + Portuguese, Brazil + English, United States + Spanish, with intentionally conflicting browser/local suggestions.
- Profile selection retains unrelated unsaved text, URL and account identity, persists through refresh and applies to both experience modes.
- Mid-quiz language change preserves current question, prior selected answer and a single attempt.
- English fallback for missing catalogs and missing/stale/unreviewed/malformed instructional records, with no language selectors inserted into learning flows.
- Complete UI keys/placeholders, real plurals, locale-aware large numbers and native language selector accessibility.
- Real API headers, locale query validation, source fingerprints, historical explanation snapshots, hidden answer keys and unchanged lesson/progress IDs.
- Six transactional email translations preserve expiry limits, token URLs and HTML escaping.
- Authentication, subscriptions, plan gates, community, resources, rewards, lesson completion, quiz submission, mobile overlays and reduced-motion regressions run through the existing suites.

## Remaining WebKit download failure

`e2e/resource-journeys.spec.ts`, R-02: WebKit on this Windows environment receives the mocked PDF attachment response but does not emit Playwright's `download` event. Chromium, mobile Chromium and Firefox pass the same journey. The trace shows HTTP 200 with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="wat-boiling-quick-reference.pdf"`, followed by WebKit's `Frame load interrupted`.

To isolate it, a temporary diagnostic test served a static HTML link and the same PDF headers/body, with **no Survival Academy JavaScript at all**. Chromium passed; WebKit again failed to emit the download event within five seconds. The diagnostic test was then removed. The original resource test remains enabled and its failure is reported, rather than hidden by a new skip. Native attachment-download verification on Safari/macOS remains outstanding; this work did not alter download authorization, endpoints or attachment disposition.

## Editorial and rollout limits

This is not a claim of complete educational localization. Per new language, 79 lesson bodies, 79 quizzes and 772 explanations remain untranslated. The full pilot lesson/quiz and its nine explanations are drafts pending appropriate human review. All downloadable artifacts remain English. The checked-in coverage reports distinguish missing, authored, draft and published states; no reviewed/published translation was fabricated. Admin API diagnostic prose and community user-authored content retain their source wording.

Non-blocking build/environment notices: the frontend bundle exceeds Vite's 500 kB warning threshold; non-English catalogs are lazy chunks. The backend declares Node >=24 while the available local runtime was Node 22.14.0. Both builds and the suites above completed on that runtime. Existing Fastify deprecation warnings were emitted during tests.

The implementation is prepared locally. Apply migrations and import reviewed content through the approved release process when production rollout is authorized.

## Subsequent local access repair

After a reported session-verification failure (`42703`, missing `users.language_confirmed_at`), the configured development connection was checked without exposing credentials: `localhost:5434/survival_academy_dev`, with 18 completed migrations. Only the pending `019_internationalization.ts` and `020_authored_metadata_translations.ts` were then applied. The account column and translation table were confirmed, and the actual `getAuthUserPayload` query succeeded. Fingerprints confirmed unchanged canonical content, existing account identifiers/preferences, sessions and learning progress. This was the local development database; production was not modified. The test results above describe the earlier disposable-database validation.
