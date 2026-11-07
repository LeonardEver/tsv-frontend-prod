# Phase 15 — MVP-wide Polish Audit & Deferred Decision Review

Date: 2026-08-13 · Scope: audit only — **no product decision was resolved in this phase.**
Evidence: unit suite (21 files / 138 tests), E2E suite (49 passed, 5 project-scoped skips),
authority fixtures, lint rules, source greps.

## 1. Surface-by-surface audit

| Surface | Route | Loading | Error | Empty | Authoritative data | Verified by |
|---|---|---|---|---|---|---|
| Login | `/login` | n/a | n/a | n/a | n/a (backend-driven OIDC link) | smoke E2E |
| Dashboard | `/dashboard` | skeleton | `ErrorState` + retry | "welcome" + empty progress card | progress/gamification verbatim | dashboard tests, smoke E2E |
| Categories | `/categories` | skeleton | `ErrorState` | empty list state | category list verbatim | unit + route audit |
| Category detail | `/categories/:slug` | skeleton | `ErrorState` | n/a | module list verbatim | unit + route audit |
| Module detail | `/modules/:id` | skeleton | `ErrorState` | n/a | lesson/quiz/progress flags verbatim | unit + route audit + E2E |
| Lesson | `/modules/:id/lesson` | skeleton | `ErrorState` | n/a | sections + `completed` verbatim | unit + lesson E2E |
| Quiz | `/modules/:id/quiz` | skeleton | `ErrorState` + retry | history empty state | safe payload; result server-only | quiz unit (7 flows) + E2E |
| Quiz result | `/modules/:id/quiz/result/:attemptId` | skeleton | `ErrorState` | n/a | result payload verbatim (`2/3`, `67%`) | quiz unit + E2E |
| Resource | `/resources/:id` | n/a | n/a | invalid ID → Not found | n/a (placeholder — see D-1) | route audit |
| Progress | `/progress` | skeleton | `ErrorState` | "No learning activity yet" / "No objective performance yet" | `progress_pct` verbatim (73≠50 fixture) | Phase 14 authority tests + E2E FLOW 1 |
| Gamification | `/gamification` | skeleton | `ErrorState` | zero XP / Locked badges | no invented XP curve; "Locked" without progress | Phase 14 authority tests + E2E FLOW 6 |
| Profile | `/profile` | skeleton (`aria-label="Loading profile"`) | retry screen — never a logout | `—` fallbacks for null fields | canonical `/auth/me` only | profile unit tests + RJ-1 |

Every surface renders loading, error (shared `ErrorState` with `describeError` copy and
`request_id` passthrough), and empty states; none invents data.

## 2. Cross-cutting concerns

- **Navigation** — header nav (Home/Learn/Progress/Gamification), account menu (Profile/Sign out),
  breadcrumbs on lesson/quiz/result, deep-link aliases (`/lessons/:id`, `/quizzes/:id`).
  Route audit renders all 9 deep links fresh + href audit passes.
- **Learning flow** — Lesson → Complete → Back to module → Quiz → Result, with the quiz
  **always available** (DEC-022): unit + E2E (quiz FLOW 2, RJ-2) assert no prerequisite.
- **Data consistency** — one resource = one canonical query key (`lib/api/keys.ts`); surfaces
  share cache entries (header chip/dashboard/gamification = one key); authority fixtures
  (73≠50, 2-of-4≠50%) prove verbatim rendering.
- **Query keys / cache** — canonical key map; `gcTime: 0` + `retry: false` on auth; no
  persister (memory-only — no cross-user cache leak on shared devices).
- **Cache & logout** — logout = authoritative POST → `clearServerCache(activeClient)` →
  redirect. Phase 15 fixed `clearServerCache` to target the **active provider client**
  (previously the app singleton — identical in production, wrong client in tests).
  Cross-user unit test + RJ-3 prove User B never sees User A's state.
- **Error/loading/empty UX** — consistent skeleton/ErrorState/empty patterns (table above);
  bootstrap failures surface a retry screen, never a logout.
- **A11y** — skip link + landmarks (smoke E2E), labeled nav/navigators, `aria-valuenow` on
  progress bars, keyboard-only quiz flow (E2E FLOW 7), focus-visible styles on controls.
- **Mobile** — Pixel 7 project: mobile flows for lesson (section chips), quiz, progress,
  gamification, and the RJ-4 core journey all pass.
- **Performance** — route-level `lazy()` code splitting; prefetch on hover/touch
  (`ModuleCard`) and on dashboard/categories render; single-digit-ms route audit.
- **Security** — no tokens in storage (lint rule); localStorage limited to user-scoped quiz
  drafts (`draft.ts` only — verified by grep); react-markdown **without** `rehype-raw`
  (boundary test); CSP documented at deployment level (README §CSP); no internal IDs,
  cookies, or provider details rendered on Profile.
- **Content boundary** — the frontend imports nothing from the Vault; all content flows
  through the API contract.
- **Analytics privacy** — no-op adapter only (`lib/analytics/events.ts`): no third-party
  scripts, no PII, no quiz answers; backend ingestion endpoint is a documented future gap.
- **Responsible gamification** — no invented XP progress bars; locked achievements show
  "Locked", never fabricated percentages; streak rendered verbatim.

## 3. Deferred product decisions (reviewed, NOT resolved)

### D-1 — Resource downloads
- **Current state:** backend exposes resource metadata (module detail `resources[]` with
  `resource_type`/`file_format`). `ResourcePage` is a placeholder validating canonical IDs;
  the module page lists resource titles without download actions.
- **Undefined:** the download delivery mechanism (direct static files vs signed URLs), file
  hosting, and the UX contract for triggering downloads.
- **Decision needed:** yes — before any download UX ships.
- **Recommendation:** signed-URL downloads behind an authenticated `GET
  /resources/:id/download`; keep the page as-is until then.

### D-2 — Module completion rule
- **Current state:** completion is computed **by the backend** (`completed`,
  `progress.completed`, category `completed_count`); the frontend renders it verbatim and
  never derives it.
- **Undefined:** the product rule itself (lesson+quiz? quiz-pass alone?) — a backend/vault
  concern, not a frontend gap.
- **Decision needed:** yes — for the backend/content model; the frontend needs no change
  (it already renders whatever the backend decides).

### Per-LO completion
- **Current state:** lesson LOs are informational only (spec Phase 12); LO *performance*
  appears where the backend supplies it (quiz result, module progress). No per-LO
  completion (checked/unchecked) UI exists.
- **Undefined:** whether individual LOs ever get a completion state, and where it would
  live (lesson view, module checklist).
- **Decision needed:** only if the product wants per-LO completion UX; informational LOs
  satisfy the current content model.

### O-3 — Display font
- **Current state:** `--font-display` is a system fallback stack ("Arial Narrow" →
  system-ui); the field-manual identity ships on system fonts.
- **Undefined:** the brand display typeface (webfont licensing, subsetting, CSP/font-src
  impact).
- **Decision needed:** yes — when brand design lands. System stack is the safe interim.

## 4. Findings (documented, intentionally not fixed this phase)

- **F-1 (cosmetic):** `ResourcePage` placeholder copy says "arrives in Phase 11" — stale
  reference; update when D-1 lands.
- **F-2 (accepted):** Profile has no desktop-nav item; reachable via the account menu only.
  Acceptable for MVP; revisit if information architecture changes.

## 5. Conclusion

All 11 surfaces satisfy the MVP bar: authoritative data only, consistent states, safe
logout, cross-user isolation, no dark patterns. Four product decisions remain deferred by
design — each reviewed above with a recommendation; none resolved.
