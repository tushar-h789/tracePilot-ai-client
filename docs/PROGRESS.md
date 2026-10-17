# TracePilot AI Client — Progress Notes

The **canonical documentation** (requirements, architecture, security, testing, ADRs, phase plan) lives in the
server repo: https://github.com/tushar-h789/tracePilot-ai-server/tree/phase-1/foundation/docs (no `main` branch exists yet). This file only records
client-specific notes.

## Phase 0 — 2026-10-17 (Asia/Dhaka, UTC+6)

- Status: complete (docs only). No `package.json`, no app code.
- Repo initialised locally as its own git repository (the parent home directory is an unrelated repo).
- Branch `phase-0/discovery` pushed; `main` exists only locally.

## UI pages (MVP)

| Page                               | Route (proposed)                        | Notes                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login / Register                   | `/login`, `/register`                   | RHF + Zod; generic auth errors; no client-side token storage (HttpOnly cookies)                                                                                                 |
| Org / project selection            | `/orgs`                                 | Create org, pick org + project; last choice remembered client-side only                                                                                                         |
| Overview dashboard                 | `/o/[orgSlug]/p/[projectSlug]/overview` | KPI cards (volume, error rate, p50/p95), Recharts time series, open incidents                                                                                                   |
| Logs explorer                      | `…/logs`                                | Time range (required), level/service/status/path/trace filters, search, cursor pagination, detail drawer                                                                        |
| Incident list                      | `…/incidents`                           | Status/severity/service filters                                                                                                                                                 |
| Incident detail + AI investigation | `…/incidents/[id]`                      | Rule + metric snapshot, related logs, timeline, ack/resolve, "Run AI investigation", status polling, hypotheses with clickable evidence ids, limitations, model id + disclaimer |
| Project settings + ingestion keys  | `…/settings`                            | Retention days, rules, keys (create shows secret once with copy button, revoke, rotate)                                                                                         |
| Org / team settings                | `/o/[orgSlug]/settings`                 | Members, roles, org name                                                                                                                                                        |

## Design direction

- Light theme by default (dark mode optional later); neutral palette with semantic colours for levels/severity
  that never rely on colour alone (icons + text labels).
- shadcn/ui primitives (Table, Sheet, Dialog, Form, Badge, Tabs, Toast); dense but readable tables; skeleton states.
- Accessibility: keyboard navigable, visible focus, labelled controls, charts paired with data-table fallback,
  axe checks in Playwright; responsive down to 360 px.
- Security in UI: never render log or AI text as HTML; hide controls the role cannot use but rely on the API for
  enforcement; send `X-CSRF-Token` on unsafe requests; same-origin `/api/v1/*` proxied to the API.
- Ports: dev server on 3100 (host ports 3000/3001 are occupied on the dev machine).

## Next (Phase 1)

`create-next-app` (TS strict, App Router, Tailwind v4), shadcn init, Vitest + RTL, Playwright, ESLint/Prettier,
OpenAPI type generation, CI workflow with least-privilege permissions.

## Phase 1 — Foundation (2026-10-17, Asia/Dhaka UTC+6)

- **Status**: complete locally; branch `phase-1/foundation` (from `phase-0/discovery`). No PR opened (no `main`
  on the remote yet — user decision pending).
- **Toolchain change**: Bun replaces npm (package manager, `bun.lock`, scripts, `oven-sh/setup-bun` in CI, Bun build
  stage in Docker). Next.js, Vitest and Playwright run on Node 24 (Vitest on the Bun runtime fails; `next build`
  and the standalone server also work on Bun — details in server ADR-004).
- **TypeScript 7 check**: TS 7.0.2 `tsc --noEmit` passes, but `eslint-config-next` cannot load (no TS JS API,
  typescript-eslint peer `<6.1`) → pinned `typescript@~5.9.3` (server ADR-016).

### Delivered

- `create-next-app` (Bun, App Router, TS, Tailwind v4, ESLint, `src/`), stricter `tsconfig` (`noUncheckedIndexedAccess`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`), Prettier (+ Tailwind plugin), shadcn init (base-nova, neutral,
  CSS variables, light theme), system font stack (no Google Fonts download).
- Route groups `(auth)/login` and `(app)/{overview,logs,incidents,settings}` with shared shell (desktop sidebar,
  mobile sheet nav, top bar, breadcrumbs placeholder, skip link), loading/error/not-found states, empty states that
  make no data claims.
- System status widget (Server Component in `<Suspense>`, `connection()` → request-time) calling
  `/health/ready` through the typed client.
- `lib/api`: base URL config, `apiRequest` (timeout, JSON, `ApiError` kinds http/timeout/network/parse/config,
  accepted statuses), generated `schema.d.ts`, `gen:api` + `check:api`.
- Security headers in `next.config.ts`; `poweredByHeader: false`; `output: "standalone"`; `/healthz`.
- Dockerfile (Bun build → Node 24 runtime, non-root), `.env.example`, CI workflow (checks, contract,
  e2e-smoke, docker), `scripts/ci-local.sh`.

### Results (executed locally)

| Check                                                                                    | Result                                                                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`                                                          | ok                                                                                                 |
| `prettier --check`                                                                       | all files formatted                                                                                |
| `eslint --max-warnings=0`                                                                | 0 problems                                                                                         |
| `next typegen && tsc --noEmit`                                                           | 0 errors                                                                                           |
| Vitest                                                                                   | **21 passed** (5 files); coverage statements 92.1 %, branches 86.5 %, functions 84 %, lines 91.9 % |
| `check:api`                                                                              | `schema.d.ts` matches server `openapi/openapi.json`                                                |
| `bun audit --audit-level=high`                                                           | 1 high (`braces`, no fix, dev-only) → triaged ignore; exit 0 with ignore                           |
| `next build` (Node)                                                                      | success; 8.4 s; peak RSS ≈ 1.0 GB; `/overview` partial prerender, other routes static              |
| `bun --bun next build`                                                                   | success (4.0 s, peak RSS ≈ 0.6 GB) — informational                                                 |
| Playwright smoke (Chromium 1248, already installed in `~/.cache/ms-playwright`, no sudo) | **3 passed**                                                                                       |
| Docker web image (via server compose `--profile web`)                                    | built, healthy, runs as uid 1000, overview shows "All systems ready"                               |
| hadolint                                                                                 | clean                                                                                              |

### Next (Phase 2)

Login/register forms (RHF + Zod), `/api/v1` proxy to the API, CSRF header handling, org/project switcher.

## Phase 2 — Identity and access (2026-10-17, Asia/Dhaka UTC+6)

Branch `phase-2/identity-access`, stacked on `phase-1/foundation` (PR base `phase-1/foundation`, retargeted to
`main` after the Phase 1 PR merges). Server-side design: server repo ADR-018/019/020, SECURITY §10.

### Delivered

- `/login` and `/register` with React Hook Form + Zod (same 12–128 policy as the API, server field errors mapped
  onto inputs, generic login error, rate-limit message, safe `next` redirects).
- Browser API client (`src/lib/api/browser.ts`): `credentials: "include"`, automatic `X-CSRF-Token`, one retry on
  `csrf_failed`; no tokens in web storage.
- Same-origin proxy route `src/app/api/v1/[...path]/route.ts`; `src/proxy.ts` optimistic redirect; server-side
  `getCurrentUser()` in the `(app)` layout (redirects to `/login` when the session is invalid).
- Sign out button in the shell; current user shown.
- `/orgs`: list + create organization (remembers last org id in localStorage — non-secret);
  `/orgs/[orgId]/members`: list, add by email, change role, remove — controls shown by role (owner/admin/member/
  viewer), server refusals displayed; not-found state for orgs the user cannot see; loading/empty/error states.
- Regenerated `schema.d.ts`; Vitest 59 tests; Playwright E2E against the real API; CI `e2e` job now starts the
  server stack (matching branch) instead of a smoke run without API.
- Low-RAM build knobs `NEXT_BUILD_CPUS` / `NEXT_SKIP_TYPECHECK` (Dockerfile uses both).

### Results (executed locally)

| Check                                         | Result                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| lint / typecheck / format:check               | clean (tsc peak 462 MB)                                                                                   |
| Vitest + coverage                             | 59 passed in 9 files; 85.48 % statements, 82.33 % branches, 79.8 % functions, 85.45 % lines (peak 494 MB) |
| check:api                                     | `schema.d.ts` matches the server's `openapi.json`                                                         |
| bun audit (high)                              | exit 0 (GHSA-vfj7-8cjw-p6xm ignored, dev-only, as in Phase 1)                                             |
| build (1 worker, typecheck separate)          | passed, peak 558 MB                                                                                       |
| Playwright E2E (real API)                     | 5/5 passed in 4.0 s, peak 615 MB                                                                          |
| Docker image via server compose + proxy smoke | built; register 202, login 200, me 200, anonymous `/orgs` → 307 `/login?next=%2Forgs`                     |

### Known limitations

- No password reset / email verification (out of scope); no org switcher in the top bar yet (org selection page).
- `src/proxy.ts` only checks cookie presence — UX, not security.
- No CSP yet (P7).

### Next (Phase 3)

Project pages and ingestion keys on top of the org scope.

## Phase 3: projects and ingestion keys (2026-10-17)

Committed directly to `main` (as the user instructed for Phase 3). Server-side design: server repo
ADR-021/022, SECURITY §11.

### Delivered

- Regenerated `schema.d.ts` from the Phase 3 OpenAPI. New aliases in `types.ts`, plus
  `src/lib/api/projects.ts` covering projects, ingestion keys, archive/restore, rotate and revoke.
- `/orgs/[orgId]/projects`:
  - list with "show archived" and cursor "Load more";
  - create form (owner/admin) with slug, environment and retention validation that mirrors the server;
  - archive with confirmation, and restore;
  - loading, empty, not-found and error states.
- `/orgs/[orgId]/projects/[projectId]`:
  - edit form (owner/admin; server field errors mapped onto inputs; read-only while archived);
  - archive/restore card;
  - **ingestion key manager**.
- Ingestion key manager:
  - create opens a modal (`KeyRevealDialog`) that shows the key once, with copy, a warning and an
    "I have saved the key" button;
  - the table shows name, prefix, status, created, last used and expiry;
  - revoke (confirmation, immediate) and rotate (confirmation, new key shown once);
  - "show revoked and expired" toggle.
  - The plaintext exists only in component state and is dropped on close.
- Role-aware UI (`canManageProjects`, `canManageKeys`, `canReadKeys`) matches the server matrix: members read key
  metadata, viewers see no keys.
- Links: org list → Projects; Members ↔ Projects.
- New `ui/dialog.tsx` (Base UI dialog).

### Results (executed locally)

| Check                           | Result                                                               |
| ------------------------------- | -------------------------------------------------------------------- |
| lint / typecheck / format:check | clean                                                                |
| Vitest + coverage               | 84 passed in 11 files (25 new); 87.41 % statements, 85.05 % branches |
| check:api                       | `schema.d.ts` matches the server's `openapi.json`                    |
| build (1 worker)                | passed; machine total peak 21.6 GB (cap 21.9 GB)                     |
| Playwright E2E (real API)       | 6/6 passed, including the new `projects.spec.ts`                     |

`projects.spec.ts` covers:

- create a project in the UI;
- create a key, which is shown once in the modal;
- the key is absent from the DOM and web storage after closing and after a reload;
- the key ingests with no cookies (202);
- revoke in the UI with confirmation;
- the same key now gets a generic 401.

### Known limitations

- No logs explorer yet (Phase 4).
- Rotation from the UI always uses a zero grace period. The API supports `grace_seconds` up to 24 h.
- The browser confirmations use `window.confirm` (consistent with the members page).

## Phase 4: log explorer, analytics and product UI (2026-10-17)

Committed directly to `main`.

### Delivered

- **Design tokens**: indigo primary and chart palette; `success` / `warning` / `info` / `danger` status tokens for
  light and dark themes.
- **Shell**:
  - collapsible desktop sidebar (icon rail, remembered in `localStorage`) and a mobile drawer;
  - org and project sections in the navigation;
  - breadcrumbs (Organizations / org / project / page);
  - a project switcher that keeps the current section;
  - legacy `/overview`, `/logs`, `/incidents` and `/settings` forward to the last-used org or project.
- **Org dashboard** (`/orgs/[orgId]`): totals across active projects, a requests/errors chart, a sortable
  per-project table, recent errors, the incidents placeholder ("Incidents arrive in Phase 5") and system status.
- **Project overview**: stat cards (requests, errors, error rate, p50/p95/p99), requests/errors and p95 charts,
  a sortable per-service table and recent errors. An empty project shows SDK and CLI ingestion guidance.
- **Metric honesty**:
  - a `null` metric renders "—" with the server's reason (no requests, no latency samples, fewer than 20 samples);
  - every card has an info popover with the formula and a link to the server's `docs/METRICS.md`.
- **Charts** (Recharts 3): `figure` + `role="img"`, a title, a screen-reader summary and a "Show data table"
  fallback. Errors are drawn dashed, so color is never the only signal.
- **Logs explorer**:
  - range presets 15m–30d, or a custom range (validated, max 30 days);
  - level and service multi-selects with facet counts;
  - environment, trace id and request id filters;
  - full-text search debounced by 350 ms.
  - Every filter is synced to the URL.
  - Pages of 50 with "Load more" (cursor, frozen time window); it never fetches all logs.
  - A detail drawer, deep-linkable with `?log=`, shows attributes as escaped JSON text (no
    `dangerouslySetInnerHTML`).
- **Org settings**: rename the organization (owner/admin); others see it read-only.
- **States**: skeletons everywhere, empty states, and error states with a Retry button.

### Results (executed locally, 2026-10-17)

| Check                                          | Result                                                                                                                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| format:check / lint / typecheck                | clean                                                                                                                                                                                                                   |
| Vitest + coverage                              | 129 passed in 16 files (45 new); 87.06 % statements, 82.66 % branches, 83.24 % functions, 88.01 % lines                                                                                                                 |
| check:api                                      | `schema.d.ts` matches the server's `openapi.json`                                                                                                                                                                       |
| bun audit (high)                               | passed                                                                                                                                                                                                                  |
| build                                          | passed in two steps: `next build --experimental-build-mode=compile`, then `--experimental-build-mode=generate`. Each stayed under its memory cap; a single `next build` was OOM-killed under the ~0.9 GB cap available. |
| Playwright E2E (real API, Phase 4 server code) | 8/8 passed, including the new `dashboard.spec.ts` (2 tests)                                                                                                                                                             |
| gitleaks (full history)                        | no leaks                                                                                                                                                                                                                |

`dashboard.spec.ts`:

1. Registers, creates an org, a project and an ingestion key in the UI.
2. Ingests 120 synthetic events (12 errors, 3 services) with the key only.
3. Checks the org dashboard shows 120 requests, 12 errors and a 10.0 % error rate, and the project overview shows
   cards, charts with a table fallback, and per-service rows.
4. Logs explorer:
   - level=error gives 12 rows;
   - service=search gives 40 rows;
   - a debounced, case-insensitive search gives 12 rows;
   - "Load more" twice reaches 120 rows and "end of results";
   - the detail drawer shows the attributes JSON and syncs `?log=`.
5. Mobile (390×844): the sidebar is hidden, and the drawer opens and navigates to Org settings.

`auth.spec.ts` now expects `/overview` to forward to the org dashboard (system status lives there).

### Known limitations

- No live auto-refresh; the dashboards have a Refresh button.
- The project switcher lists the first 100 projects of the org.
- The metrics doc link points at the server repo on GitHub.
- Incidents are a placeholder until Phase 5.
