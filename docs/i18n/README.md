# Survival Academy internationalization

Implementation prepared on 2026-11-08. This feature preserves the V2 design, curriculum IDs, quiz scoring, progress, XP, account identity, plan entitlements and billing currency. It does not deploy the app or change production data.

## Architecture and preference

The [repository assessment](../i18n-architecture.md) describes the existing React/Vite, Fastify/Knex and PostgreSQL architecture. The implementation uses one typed i18next/react-i18next instance, 13 domain namespaces and English fallback. English loads with the app; the other five catalogs load before committing a language change. Admin Analytics now shares this instance instead of maintaining a second language setting.

| Interface locale | Formatting locale | Native name |
| --- | --- | --- |
| en | en-US | English |
| pt-BR | pt-BR | Português (Brasil) |
| es | es-ES | Español |
| fr | fr-FR | Français |
| de | de-DE | Deutsch |
| it | it-IT | Italiano |

Browser variants normalize to the supported language (`pt-PT` → `pt-BR`, `es-MX` → `es`, etc.). The precedence is confirmed account preference → explicit local preference → first supported browser language → optional country suggestion → English. Country is never treated as a preference. No geolocation service, location permission, IP storage or geolocation network request was introduced.

Registration and login offer a compact accessible native-language selector. Profile saves language immediately without logout; PRO and SIMPLIFIED use the same preference. There are no language selectors in learning flows, the header or sidebar. `users.language_confirmed_at` distinguishes explicit account choices from the database default. Existing account preferences are preserved by the migration. Local persistence stores only a locale; the legacy Admin language preference is read for compatibility. Authenticated rendering waits for initial account language resolution; subsequent changes keep the active form/lesson mounted.

API requests send `Accept-Language`. Locale-sensitive query keys isolate content caches; progress and entitlements stay language-independent. Mutations invalidate all locale variants where appropriate. Active lesson and quiz queries retain the current entity during a locale fetch, keeping question, answer selection and attempt identity intact. Dates, numbers, plurals and monetary formatting follow the locale; prices and currency remain server values.

## UI coverage

[UI coverage by namespace and locale](ui-coverage.json) records **1,802 keys per language** across authentication, common, community, dashboard, errors, learning, navigation, progress, public, rewards, settings, subscriptions and admin. All six catalogs have the same keys and interpolation tokens. This includes 73 display labels for the actual published subcategory slugs; the slugs themselves remain unchanged. The account notification inbox is documented in [notifications.md](../notifications.md).

The [source inventory](ui-source-inventory.json) reports zero candidates under its documented static UI heuristic. This is a diagnostic, not a claim that arbitrary API data is translated. User-authored community content, user names, proper publication titles, canonical identifiers and provider diagnostics are not automatically rewritten. Admin API diagnostic notes/reasons remain the backend's original wording; admin navigation, labels, help, charts and dialogs use the shared catalogs. New API enum/display values require an explicit presentation mapping.

## Actual educational content coverage

The [canonical source snapshot](content/source.json) contains the real published curriculum: 9 regions, 80 modules, 80 lessons, 80 quizzes, 781 explanations, 81 resource titles and 7 achievement definitions. It is an offline editorial artifact, never part of the frontend runtime bundle. The [coverage report](content/coverage.json) distinguishes authored metadata, instructional drafts, reviewed records and missing translations.

The following counts apply **separately to each of pt-BR, es, fr, de and it**:

| Domain | Canonical total | Authored metadata | Instructional drafts | Reviewed/published | Missing |
| --- | ---: | ---: | ---: | ---: | ---: |
| Region names | 9 | 9 | 0 | 0 | 0 |
| Module titles | 80 | 80 | 0 | 0 | 0 |
| Module descriptions | 80 | 80 | 0 | 0 | 0 |
| Knowledge-item titles | 80 | 80 | 0 | 0 | 0 |
| Lesson titles | 80 | 80 | 0 | 0 | 0 |
| Quiz titles | 80 | 80 | 0 | 0 | 0 |
| Resource titles | 81 | 81 | 0 | 0 | 0 |
| Achievement titles/descriptions | 7 | 7 | 0 | 0 | 0 |
| Full lessons including objectives | 80 | 0 | 1 | 0 | 79 |
| Full quizzes including options | 80 | 0 | 1 | 0 | 79 |
| Answer explanations | 781 | 0 | 9 | 0 | 772 |
| **Total translation records** | **1,438** | **497** | **11** | **0** | **930** |

The complete pilot is `SUR-emergency-planning-L01` / `SUR-emergency-planning-Q01`: all sections, six objectives, nine questions, all alternatives and nine explanations in each new language. These are authored translations of the English source, not invented replacement lessons. They remain safety-critical drafts until an appropriate human reviewer checks the instruction, terminology, units and local applicability. No invented reviewer identity or review timestamp was assigned.

**The entire educational library is not yet localized.** The remaining 79 lesson bodies and quizzes per language, and 772 explanations, are missing. Even the pilot is intentionally unavailable as verified localized instruction before review/publication. Missing, stale, invalid or unreviewed instructional entities return the complete English unit with explicit metadata and an inline translated fallback notice. No language-choice prompt interrupts learning. All downloaded files currently remain English; localized titles do not imply translated PDF contents. Resource screens disclose this separately.

## Database and API compatibility

Backend additive migrations:

- `019_internationalization.ts`: account confirmation marker and normalized `content_translations` table.
- `020_authored_metadata_translations.ts`: authored metadata status that cannot be used to bypass review for lessons, quizzes or explanations.

Records use entity type + canonical ID + locale + source hash, with source version, localized field projection, safety flag, review state and reviewer metadata. Adding a language never duplicates lessons, users or progress. Only allowlisted text fields are applied. IDs, question types, option labels, correct answers, links, licenses and business fields cannot be translated by an import.

Supported content routes accept `Accept-Language` and an optional canonical `?locale=` on GET. Non-English responses add `localization` with requested/content locale, fallback reasons, missing count and artifact locale. Responses vary by `Accept-Language`, expose content language and use localized payload ETags. English consumers retain the original response shape. The generated backend OpenAPI and frontend types include the optional metadata. Historical explanation translations match the saved result's English snapshot rather than silently replacing it with a later question edit. Quiz retrieval never exposes correct answers or explanations before submission.

Apply migrations through the existing release process before enabling content imports in a target environment. Source updates invalidate translations whose hash/version no longer matches. A missing translation table during an additive rollout produces explicit English fallback; unrelated database errors are not hidden.

Before starting the updated backend locally, apply pending schema migrations to the explicitly configured development database. In the available Node 22 environment, use the TypeScript loader:

```powershell
# From backend, with DATABASE_URL pointing to the intended local development database
pnpm exec tsx node_modules/knex/bin/cli.js migrate:latest --knexfile knexfile.ts --env development
```

The updated auth/profile queries require `users.language_confirmed_at`; starting the new code against an unmigrated database causes PostgreSQL error `42703` during session verification. The English content fallback cannot repair a missing account column. Do not use a rollback, reset or seed to resolve this setup mismatch.

## Repeatable UI authoring

Run from `frontend`:

```powershell
node scripts/i18n/add-ui-keys.mjs
node scripts/i18n/add-notification-keys.mjs
node scripts/i18n/build-subcategory-labels.mjs
node scripts/i18n/build-catalogs.mjs
node scripts/i18n/audit-source.mjs
node scripts/i18n/build-content-packs.mjs
```

Use typed namespace keys in components. Add canonical English copy under `src/i18n/locales/en/`, and authored translations under `scripts/i18n/copy/`. `.txt` files have English + five translations separated by `|`; `.json` overrides have `namespace:key` → five translations. `.admin` files preserve the original Portuguese admin catalog while adding the other languages. `subcategories.labels` stores a canonical slug plus six display labels. The builders check key/placeholder parity and regenerate reports. They do not call a translation API. Generated locale catalogs are checked in and bundled by language.

Use complete interpolated messages or `Trans` with controlled React components for links. Do not concatenate grammatical fragments. Use locale-aware formatting helpers and plural suffixes; preserve API enums and translate only their display names. Initial migration/codemod scripts are historical one-time transforms and must not be rerun as the maintenance workflow.

## Offline content workflow

Run the following commands from `backend` against an explicitly configured **local/staging** database. These commands do not contact AI services or send email. `validate --source` works from files without querying curriculum data.

```powershell
pnpm exec tsx scripts/content-i18n.ts export --out sources.json
pnpm exec tsx scripts/content-i18n.ts validate --source sources.json --file pt-BR.json
pnpm exec tsx scripts/content-i18n.ts import --file pt-BR.json
```

`import` is validation-only by default. An actual import requires `--write`, validates again against the target database and writes only translation records in a transaction. The authoring CLI rejects production writes. It never modifies canonical English instruction, accounts or progress.

```powershell
pnpm exec tsx scripts/content-i18n.ts import --file pt-BR.json --write
pnpm exec tsx scripts/content-i18n.ts coverage --locale pt-BR --out coverage-pt-BR.json
```

Editorial safety review is an actual human task. After reviewing a selected instructional pack, a reviewer can create a reviewed/published output file:

```powershell
pnpm exec tsx scripts/content-i18n.ts review --source sources.json --file reviewed-input.json --reviewer "actual reviewer identity" --acknowledge-safety-review --publish --out reviewed-output.json
```

This command records the review assertion; it does not perform or certify the review and does not import anything. Keep unreviewed records out of a pack being published. Validation rejects changed IDs, answer labels, numeric limits, code, links, WikiLink targets, placeholders, missing sections/options, forged sources, duplicates and publication without review metadata. Exact symbol units are protected; word-based units, grammar, factual safety and regional terminology still require review.

The five checked-in packs were validated and imported twice in `localhost:5434/survival_academy_i18n_test`, a dedicated disposable database. The local reports `content/local-validation-*.json` come from those actual records. Canonical-content/account/progress table fingerprints were compared before and after import. Real Fastify responses served translated metadata and explicit English fallback for the unreviewed pilot in every locale. No development or production curriculum was replaced.

## Adding another language

1. Add its canonical code, native name, formatting locale and browser normalization to frontend `src/i18n/config.ts` and backend `src/shared/i18n/locales.ts`.
2. Add a lazy catalog loader in `src/i18n/index.ts`. Extend the authoring builders' locale arrays and translation input schema together.
3. Author every namespace and preserve interpolation tokens, plural forms and controlled rich-text tags. Regenerate locale indexes and coverage. Do not fill gaps by copying English and calling them translated.
4. Extend backend locale validation. Translation storage uses text locale identifiers, so another language requires no new content column or migration. If a future release adds a SQL locale constraint, change it through a new additive migration rather than editing an already-applied migration.
5. Add transactional email copy, review Stripe's supported locale mapping, and preserve existing billing prices/currency.
6. Export canonical content, author localized projections, validate against source hashes, obtain instructional review and publish/import through the approved release process.
7. Add precedence, account synchronization, cache isolation, draft fallback, quiz-state retention and long-label browser scenarios. Run all existing checks and regenerate the OpenAPI/client types.

## Validation

Automated results and remaining browser limitations are recorded in [validation.md](validation.md). Visual screenshots for the German profile in desktop/mobile and all browser projects live under `visual-review/i18n/`.
