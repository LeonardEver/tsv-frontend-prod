# Survival Academy — Frontend

Vite 7 + React 19 SPA (client-side rendered), mobile-first. The backend
(`../backend`) is the authoritative API; this app renders its state and
holds no authority of its own.

Architecture and decisions: `vault/the-survival-vault/00 - System/SAAS-FRONTEND-TECHNICAL-SPEC.md` (this README documents the operational bits).

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server on :5173, proxies `/api` → `http://localhost:3000` (VITE_DEV_PROXY_TARGET) |
| `pnpm api:generate` | Regenerate `src/types/api.d.ts` from `../backend/generated/openapi.json` (deterministic) |
| `pnpm api:check` | Generate + fail if the committed types drift |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Gates (ESLint strict-typechecked / tsc strict / Vitest+RTL+MSW) |
| `pnpm build` / `pnpm build:analyze` | Production build / bundle stats (`dist/stats.html`) |
| `pnpm e2e:install` / `pnpm e2e` | Install Chromium / run Playwright smoke (dev server, API mocked via page.route) |

## Environment (VITE_* — client-visible, NEVER secrets)

| Var | Default | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `""` | API origin prefix. Empty = **same-origin** (production: Nginx serves both SPA and `/api`). |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:3000` | Dev proxy target for `/api`. |
| `VITE_CONTRACT_CHECK` | `1` in dev | Dev-only response-shape validation (silent in prod builds). |

Build-time guards (fail the build): non-production builds targeting `*.survivalacademy.com`, and production builds with a non-HTTPS API base.

## Authentication

Backend-authoritative session cookie (`session_id`, HttpOnly, `Path=/api`).
The frontend calls `/auth/me`, follows the backend-driven OIDC redirect
(`/api/v1/auth/login`), and posts logout. **No tokens in localStorage,
no cookie reading, no client-side auth cryptography.**

**No `/register` route** — the backend auto-provisions accounts on first
OIDC login; no registration behavior is invented (spec §5.2/§6.1).

## Security strategy

- **CSP (deployment-level, Nginx)** — documented for the static host:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';
  object-src 'none'; base-uri 'self'; form-action 'self'`
  `'unsafe-inline'` styles are required by Radix positioning (inline style
  attributes) and remain allowed; scripts are strictly `'self'` (no inline
  scripts exist in the build). Vite dev does not emit CSP — production
  headers are an Nginx responsibility (deployment runbook).
- Frame protection, referrer policy, HSTS: configured at Nginx
  (`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **Content rendering:** `MarkdownContent` is the only API-content
  renderer — react-markdown WITHOUT `rehype-raw` (embedded HTML never
  becomes DOM), URL scheme allowlist, forced `rel="noopener noreferrer"`.
  `react/no-danger` is lint-enforced (no `dangerouslySetInnerHTML`).
- **localStorage policy (lint-enforced):** only keys starting with
  `quiz-draft:` (the user's own temporary quiz draft). No tokens, no
  sessions, no server cache, no gamification state — the custom rule
  `eslint/no-unrestricted-local-storage.js` blocks everything else.
- **Query cache:** memory-only, never persisted (no cross-user leakage).
- **Errors:** `lib/api/errors.ts` normalizes the backend envelope; UI
  maps stable codes via `lib/api/error-map.ts`; `request_id` is the only
  passthrough for support correlation.

## FRONTEND BLOCKER — G-15 (backend gap, documented)

The backend OpenAPI export declares **no response schemas** for the
lesson/quiz/resource/progress/gamification endpoints (only auth/me,
categories, and route params are declared). openapi-typescript therefore
cannot infer those response types. The foundation uses minimal
structural types derived from API-CONTRACT.md (`lib/api/types.ts`,
marked G-15). **Recommended Phase 11 backend enabler:** declare response
schemas on the remaining routes and re-export the OpenAPI doc — then the
structural fallbacks disappear.

## Test auth strategy

Unit/component: MSW mocks `/auth/me` at the network boundary.
E2E (Playwright): `page.route` mocks the API; the session is simulated
by the mocked `/auth/me` response. No real OAuth credentials exist in CI
or in this repository.
