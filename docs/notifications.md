# Account notifications

The header bell now opens an accessible inbox instead of a decorative button. Its unread indicator reflects the server response and disappears after acknowledgement. The panel supports keyboard navigation, Escape, outside-click dismissal, localized messages, loading/error/retry states, a truthful empty state, and viewport containment above the mobile navigation.

The feed shows the latest 30 updates from existing account records:

- Completed lessons and quizzes from the authenticated user's learning events. Start/download events are not notifications.
- Actually earned achievements, with a link to Rewards.
- Replies by other people to the user's visible community posts, only while the account has community access. Hidden/removed comments and self-replies are excluded. Notification responses expose no comment bodies or other users' private profile data.

There are no fabricated announcements or default unread dots. Events carry stable identifiers across languages. Clicking an item acknowledges it and navigates to its real destination. Mark-all acknowledges the displayed unread IDs only, so a newly arriving notification is not silently read. Opening the panel alone does not acknowledge anything.

## Backend

`021_notification_reads.ts` adds `user_notification_reads` with `(user_id, notification_id)` as its primary key and an account foreign key with cascade deletion. It stores read receipts only; curriculum, learning history and reward calculations remain unchanged. No notification/account data is persisted in browser storage.

- `GET /api/v1/notifications`: authenticated, newest-first bounded feed and unread count for that displayed window, `Cache-Control: private, no-store`.
- `POST /api/v1/notifications/read`: authenticated JSON `{ notification_ids: ["event:123", "achievement:7", "reply:42"] }`, at most 30 unique IDs. Only the current account's presently visible notifications can be acknowledged. Unknown/foreign IDs do not write read receipts. Repeated acknowledgement is idempotent.

Module and achievement subject copy uses the existing content-localization projections; post titles remain user-authored content. Notification kind labels, status, errors and actions have all six UI translations. Cache keys include account ID and locale, and acknowledgement invalidates every language variant of that account's feed. The header refreshes on focus, every 60 seconds while active, and when opened. This is an in-app inbox; it requires no browser notification permission or third-party messaging service.

The migration was applied to the configured **localhost development database** after verifying the target. Canonical content, account identifiers/preferences, sessions and learning-progress fingerprints were unchanged. Production was not modified. Other environments must apply the migration through their usual release process before running the updated backend.

## Validation

Automated API integration covers authentication, genuine owned events, suppression of private event payloads, persistent/idempotent reads, foreign-account isolation, plan-gated/hidden/self replies, invalid request validation and explicit mark-all. These tests use only the disposable local test database.

UI tests cover empty/loading/error recovery, no fabricated badge, mark-all persistence, real link destinations, failed read acknowledgement and Portuguese copy. Browser tests verify all three inbox journeys in Chromium desktop, Pixel mobile, Firefox and WebKit, plus existing mobile overlay/layout checks. The shell no longer hides the English-language bell on mobile; account-name layout uses a stable attribute instead of translated accessibility labels.

Screenshots are in `visual-review/notifications/`. The OpenAPI contract and frontend generated types include both endpoints. Repeatable notification-copy authoring lives in `scripts/i18n/add-notification-keys.mjs`; run it before `scripts/i18n/build-catalogs.mjs` after changing that copy.

Completed checks: 359 frontend unit/component tests, 125 backend unit tests, 365 backend integration tests, and 22 browser scenarios across the notification inbox and existing mobile overlays passed. The Portuguese empty-inbox scenario also passed at 320px without horizontal overflow. Frontend/backend builds and TypeScript checks passed; lint has no errors (the frontend retains its five existing Fast Refresh warnings).
