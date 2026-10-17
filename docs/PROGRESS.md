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
