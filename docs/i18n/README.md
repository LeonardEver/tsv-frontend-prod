# Survival Academy internationalization

Translation delivery integrated locally on 2026-11-08. All five additional website languages have complete curriculum coverage. English remains the canonical source and the language of PDF file contents. No production deployment or production database change was performed.

## Integrated delivery

The other model's completed offline instructional translations were integrated with the application audit fixes. Its final locale packs contained newer translations than the intermediate `instructional/` files. Those authoring files now match the delivered packs, so regenerating the release preserves the completed work.

The integration fixes locale-sensitive caches, requests and pagination, active quiz state, submitted-result explanations, notification/error/toast copy, translated resource titles and remaining UI constants. A resource's own title is distinct from its parent module title. The Base Camp community preview uses a separate cache key from the infinite community feed.

Internal references such as `[[canonical-reference]]` remain exactly as in the English source. The integration removes the proposed reference-alias renderer and preserves the existing Markdown renderer. Canonical IDs, answer labels, scoring, XP, progress, user accounts, plan entitlements and billing currency are unchanged. User-authored posts, names, proper publication titles and internal diagnostic prose retain their original wording.

## Languages and preferences

| Interface locale | Formatting locale | Native name |
| --- | --- | --- |
| en | en-US | English |
| pt-BR | pt-BR | Português (Brasil) |
| es | es-ES | Español |
| fr | fr-FR | Français |
| de | de-DE | Deutsch |
| it | it-IT | Italiano |

One typed i18next/react-i18next instance supplies 13 namespaces for PRO, Simplified and Admin. The [UI coverage report](ui-coverage.json) contains **1,839 keys per language**, with matching keys and interpolation tokens. This includes display labels for all 73 published subcategory slugs; the identifiers themselves remain unchanged.

Preference precedence is confirmed account preference → explicit local preference → first supported browser language → optional country suggestion → English. Country never overrides an explicit choice. Browser variants normalize to supported locales. No geolocation service was introduced.

Registration/login offer the native-language selector; profile changes apply without logout. All namespaces load and pass completeness checks before committing a language change. Missing UI translations show localized unavailable copy instead of silently inserting English. Account bootstrap resolves the confirmed language before rendering protected content.

API calls send `Accept-Language`; content caches include the locale. Multi-page inventory requests retain their starting locale, and retries retain the original request locale. Old translated lesson content is hidden while the new language loads. Active quizzes preserve question, answers and attempt identity during the fetch. Submitted results refresh explanations while preserving authoritative grading and the original XP receipt. Existing form drafts remain mounted; error and toast copy follows subsequent language changes.

## Educational content coverage

The [canonical source snapshot](content/source.json) and the five complete packs are offline editorial artifacts, excluded from the frontend runtime bundle. Counts below apply **to each of pt-BR, es, fr, de and it**:

| Domain | Records | Delivery state |
| --- | ---: | --- |
| Region names in the curriculum snapshot | 9 | Authored metadata |
| Module titles and descriptions | 160 | Authored metadata |
| Knowledge-item, lesson and quiz titles | 240 | Authored metadata |
| Resource titles | 81 | Authored metadata |
| Achievement titles/descriptions | 7 | Authored metadata |
| Full lessons, objectives and section headings | 80 | Machine translated; human review pending |
| Full quizzes, questions and alternatives | 80 | Machine translated; human review pending |
| Answer explanations | 781 | Machine translated; human review pending |
| **Total** | **1,438** | **497 metadata + 941 instructional; zero missing** |

The [coverage report](content/coverage.json) records actual states. Full instructional sources and provider provenance live under `content/instructional/`. Delivered instruction uses the separate `machine_translated` state, with no fabricated reviewer identity or review date. The app serves validated translations and discloses pending review. They are not represented as human-reviewed or published translations. Future reviewed/published records take precedence and are preserved by imports.

Release artifacts also include 11 category labels from `content/category-additions.json`, covering all 20 seeded taxonomy categories across environments. The importer excludes extra unused category labels but rejects unknown instructional entities. It never creates curriculum records.

English PDF contents are intentionally unchanged. Their website titles and availability labels are localized, and resource pages separately disclose the English file language. Opening and downloading PDFs still require paid server-side entitlement. No runtime AI or external translation request is used.

## Backend and rollout contract

Apply additive migrations through the existing release process before starting the updated backend:

- `019_internationalization.ts`: explicit account-language confirmation and translation storage.
- `020_authored_metadata_translations.ts`: authored metadata state.
- `021_notification_reads.ts`: notification read receipts.
- `022_machine_authored_instruction.ts`: explicit machine-translated instructional state.

Apply pending migrations in order. In the available Node 22 environment, the existing TypeScript migration loader is:

```powershell
# From backend, with DATABASE_URL explicitly set for the intended environment
pnpm exec tsx node_modules/knex/bin/cli.js migrate:latest --knexfile knexfile.ts --env development
```

The updated authentication query requires `users.language_confirmed_at`. A missing column causes PostgreSQL `42703` during session verification. Apply the additive migration instead of resetting or reseeding the database.

Translation records bind entity type, canonical ID, locale, source version and source hash. Only allowlisted text projections can change. Responses expose locale metadata, `Content-Language`, `Vary: Accept-Language` and locale-specific ETags. Quiz retrieval still hides correct answers and explanations until submission; historical results use their saved source snapshots.

**A missing, stale, invalid or draft translation fails closed with `503 CONTENT_TRANSLATION_UNAVAILABLE` and localized UI copy.** It no longer inserts an English unit into another language. Missing translation schema during rollout also fails closed. The client rejects successful content responses with a mismatched locale or incomplete translation metadata. English requests retain their original content contract. PDF `artifact_locale: en` is separate from the website `content_locale`.

## Repeatable authoring and release artifacts

From `frontend`, to ingest a replacement complete offline delivery and rebuild checked-in packs:

```powershell
node scripts/i18n/sync-instructional-packs.mjs
node scripts/i18n/build-content-packs.mjs
pnpm i18n:check
node scripts/i18n/stage-release-artifacts.mjs
```

The synchronization step preserves canonical internal references. The builder uses complete instructional files in preference to old pilot drafts. The release gate checks all five packs, source hashes/versions, full record coverage, immutable fields, numbers, code, links, literal internal references, catalog parity and untranslated full instructional sections. It runs automatically in both build commands. All authoring commands work offline.

The staging command writes the backend release directory `migrations/data/content-locales-20261108/` with five packs and a SHA-256 manifest. For a frontend-only sandbox, `--staging` writes under `tmp/translation-merge-backend/files/` instead. Use `stage-backend.mjs` / `apply-backend.mjs` to review and apply those files with preimage checks. Backend images already include `migrations/`.

For UI maintenance, add typed keys to canonical English and translations under `scripts/i18n/copy/`, then run the applicable additive key scripts (including `add-language-audit-keys.mjs`), `build-catalogs.mjs` and the release gate. Initial migration/codemod scripts are historical one-time transforms. The broad [literal inventory](all-literals-inventory.json) is a diagnostic, not proof that arbitrary API data has been translated.

The backend's offline authoring CLI exports sources, validates packs, imports into development/staging and records an actual human review assertion. Import is a dry run unless `--write` is supplied, and that authoring command rejects production writes. It never alters English sources, users or progress.

The compiled release command validates the packaged manifest against the target's live curriculum. Run from `backend` with the intended `DATABASE_URL` configured:

```powershell
node dist/shared/i18n/release.js
node dist/shared/i18n/release.js --verify-installed
# For an authorized installation, use the fingerprint printed by the dry run:
node dist/shared/i18n/release.js --apply --confirm-database <fingerprint>
# A production installation additionally requires --allow-production.
```

The dry run is read-only. An installation validates all five packs before writing translation rows in one transaction, protects the source with transaction locks, preserves reviewed/published records and verifies installed completeness before commit. There is no automatic startup import or public import route. Production installation was **not executed** as part of this integration.

## Validation evidence

The final packs were installed in the explicitly guarded local development database. [Local installation evidence](merged-local-validation.json) records complete coverage and unchanged fingerprints for 16 canonical/account/billing/progress tables. Per-locale `content/local-validation-*.json` now reflect that installation rather than the earlier pilot.

[Real API evidence](merged-api-validation.json) checks all 80 lessons, 80 quizzes and 81 resources in each language, correct locale headers, hidden answer keys, English PDF artifact metadata and unchanged paid PDF gates. The temporary API-test account was removed and protected-table fingerprints matched afterwards. Destructive integration tests used only the separate disposable test database.

See [validation.md](validation.md) for final test counts and known environment limitations. No production deployment, production import, payment or outbound email was performed.
