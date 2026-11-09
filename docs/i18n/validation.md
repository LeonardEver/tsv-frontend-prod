# Translation integration validation — 2026-11-08

This report supersedes the initial pilot validation. The completed offline delivery is integrated with the application audit fixes. Production was not deployed or modified.

## Current evidence

| Check | Result |
| --- | --- |
| UI catalogs | Six languages, 1,839 keys each; key/interpolation parity |
| Full curriculum packs | Five languages × 1,438 records; strict source/hash/structure validation passed |
| Instructional coverage per language | 80 full lessons, 80 full quizzes, 781 explanations; zero missing |
| Internal reference preservation | Literal canonical references preserved; alias-renderer experiment removed |
| Frontend unit/component suite | 379 passed across 54 files |
| Backend unit suite | 148 passed across 11 files |
| Backend integration suite | 367 passed across 21 files |
| Browser language journeys | 14 passed across Chromium and mobile Chromium |
| Frontend and backend TypeScript/build | Passed |
| Lint | Backend passed; frontend zero errors and five existing Fast Refresh warnings |
| OpenAPI and client type generation | Completed with localized response metadata |
| Real local import | All five locales installed completely; 16 protected tables unchanged |
| Real API content audit | Each locale: all 80 lessons, 80 quizzes and 81 resources passed |
| PDF authorization | Free preview and download denied; English artifact metadata preserved |
| Temporary API-test account | Removed; protected table fingerprints still match |

The final frontend unit/component suite passed: **379 tests across 54 files**, including pagination and submitted-result language regressions. Backend integration tests used only `localhost:5434/survival_academy_i18n_test`. The guarded content installation and real API audit used the local development database; details are in [merged-local-validation.json](merged-local-validation.json) and [merged-api-validation.json](merged-api-validation.json).

## Covered regressions

- Incomplete, stale, invalid or missing translations produce localized unavailable states rather than mixed English instructional content.
- Cache keys, multi-page requests and retries preserve the correct content locale.
- Active quizzes keep selected answers, question position and one attempt while language-specific text is refreshed.
- Submitted results refresh explanations without replacing the authoritative score or losing earned XP.
- Lesson objectives, section navigation, quiz alternatives and feedback use the selected language.
- Profile changes preserve unrelated unsaved fields, URL, account identity and language persistence.
- Errors, validation, toasts and notifications follow subsequent language changes.
- Source IDs, answer labels, correct answers, protected units/numbers, links and literal internal references remain intact.
- Resource titles are translated independently from their parent module titles.
- Base Camp community previews cannot corrupt the infinite-feed cache shape.
- Paid PDF authorization and the existing local-only mock/Stripe boundary remain enforced.

## Editorial state and environment limits

The 941 instructional records per locale are explicitly machine translated and pending human review. No reviewer identity, review timestamp or published status was fabricated. Existing human-reviewed/published records are preserved by imports. English remains the canonical curriculum and the file language of PDFs. User-authored community text, names, internal identifiers/references and diagnostic prose retain their authored wording.

The initial full browser regression run, before this integration, recorded 452 passes, 31 project-specific skips and one WebKit attachment-download failure on Windows. A minimal static-link diagnostic reproduced that missing download event without application JavaScript. The final language journeys passed on Chromium and mobile Chromium; native Safari/macOS attachment verification remains outstanding. This integration does not claim a new full four-browser run.

Existing non-blocking notices: Vite's 500 kB chunk warning, five frontend Fast Refresh export warnings, Fastify deprecation notices and a local Node 22 runtime against the backend's declared Node >=24. Both builds and the suites above completed on the available runtime.

The release artifacts and manual transactional installation command are prepared. Production migrations/import/deployment were not executed.
