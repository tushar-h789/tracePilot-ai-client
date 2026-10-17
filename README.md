# TracePilot AI — Client

Next.js web application for **TracePilot AI**, an AI-assisted application observability and incident
investigation platform (portfolio MVP).

> Status: **Phase 2 — identity and access**: sign in / register (React Hook Form + Zod), cookie-only sessions
> through a same-origin `/api/v1` proxy with automatic CSRF headers, server-side auth check for app pages, sign
> out, organization list/create and a members page with role-based controls. Built on the Phase 1 foundation
> (app shell, system status widget, generated API types, tests, CI).

Canonical docs (requirements, architecture, security, ADRs) live in the server repo:
[tracePilot-ai-server/docs](https://github.com/tushar-h789/tracePilot-ai-server/tree/phase-1/foundation/docs).
Client notes: [docs/PROGRESS.md](docs/PROGRESS.md).

## Stack

Next.js 16.4 (App Router, Turbopack, Cache Components) · React 19.3 · TypeScript 5.9 (strict +
`noUncheckedIndexedAccess`) · Tailwind CSS v4 · shadcn/ui (`base-nova`, Base UI primitives, CSS-variable tokens,
light theme) · Vitest 5 + React Testing Library · Playwright 1.64 · openapi-typescript 7 · **Bun 1.3** as package
manager/script runner, **Node 24** as the Next.js runtime (see server ADR-004 for what was verified on Bun).

## Prerequisites

Bun ≥ 1.3.14 and Node ≥ 24. Sibling checkout of the server for API type generation:

```
tracePilot-ai/
  tracePilot-ai-server/   # API + docker-compose.yml (can build this app with --profile web)
  tracePilot-ai-client/   # this repo
```

## Getting started

```bash
bun install --frozen-lockfile
cp .env.example .env.local          # API_BASE_URL=http://localhost:8000/api/v1 (server-side only)
# start the API: in ../tracePilot-ai-server → docker compose up -d && docker compose run --rm migrate
bun run dev                         # http://localhost:3100 → /register, then /login
```

### How auth works in the browser

- The browser only talks to this app's origin. `src/app/api/v1/[...path]/route.ts` forwards `/api/v1/*` to
  `API_BASE_URL` (header allowlist, 1 MiB body cap, 15 s timeout, `Set-Cookie` passed through), so the API's
  `tp_session` (HttpOnly) and `tp_csrf` cookies are first-party.
- `src/lib/api/browser.ts` sends `credentials: "include"` and copies `tp_csrf` into `X-CSRF-Token` on unsafe
  methods (fetching a token first if needed; one retry on `csrf_failed`). Nothing is stored in
  localStorage/sessionStorage except the non-secret last-selected organization id.
- `src/proxy.ts` redirects to `/login?next=…` when the session cookie is missing (UX only). The `(app)` layout
  calls `GET /auth/me` on the server and redirects if the session is invalid; every permission decision is made by
  the API (403/404), the UI only hides controls the role cannot use.

The overview page shows **System status** from `GET /api/v1/health/ready` (ok / degraded / unreachable).

## Scripts

| Script                                     | What it does                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `bun run dev`                              | dev server on port 3100 (3000/3001 are taken on the dev machine)                               |
| `bun run build`                            | `next build` (standalone output) + copies `public/` and `.next/static` into `.next/standalone` |
| `bun run start`                            | runs the standalone server with Node (`PORT` defaults to 3100)                                 |
| `bun run lint` / `format` / `format:check` | ESLint (Next.js + TS rules, `react/no-danger`) / Prettier                                      |
| `bun run typecheck`                        | `next typegen && tsc --noEmit`                                                                 |
| `bun run test` / `test:coverage`           | Vitest + RTL (jsdom)                                                                           |
| `bun run test:e2e`                         | Playwright E2E against the real API (needs the API stack, `bun run build`, Chromium)           |
| `bun run gen:api`                          | regenerate `src/lib/api/schema.d.ts` from `../tracePilot-ai-server/openapi/openapi.json`       |
| `bun run check:api`                        | fail if the generated types drift from the server schema (`OPENAPI_SPEC` overrides the path)   |
| `bun run audit`                            | `bun audit --audit-level=high` with documented ignores                                         |
| `./scripts/ci-local.sh`                    | everything CI runs, locally (`SKIP_E2E=1` to skip Playwright; E2E needs the API running)       |

## Structure

```
src/
  app/
    (auth)/{login,register}/ # sign-in / registration pages
    (app)/layout.tsx         # server-side auth check + shared shell (sidebar, top bar, sign out)
    (app)/{overview,logs,incidents,settings}/page.tsx
    (app)/orgs/              # organization list/create; [orgId]/members (role-based controls)
    api/v1/[...path]/        # same-origin proxy to the API
  proxy.ts                   # optimistic redirect to /login when the session cookie is missing
    loading.tsx, error.tsx, not-found.tsx, healthz/route.ts
  components/
    ui/                      # shadcn primitives (button, card, badge, input, label, alert, …)
    auth/, organizations/    # forms, logout button, current-user context, org + members views
    layout/                  # app shell, sidebar nav, mobile nav, breadcrumbs, page header
    system-status/           # server component + presentational view
    empty-state.tsx, route-error.tsx
  lib/api/
    config.ts                # single source of the API base URL
    client.ts, errors.ts     # typed fetch wrapper (timeout, JSON, ApiError)
    schema.d.ts              # GENERATED by openapi-typescript — do not edit
    types.ts, health.ts
    browser.ts, csrf.ts      # browser client: credentials include + automatic CSRF header
    auth.ts, organizations.ts
  lib/auth/                  # Zod schemas, roles, safe redirects, server-side getCurrentUser
tests/unit/                  # Vitest
e2e/                         # Playwright
```

## Configuration

| Variable              | Scope                             | Purpose                                                                                 |
| --------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `API_BASE_URL`        | server only, read at request time | API base, default `http://localhost:8000/api/v1`; compose sets `http://api:8000/api/v1` |
| `NEXT_BUILD_CPUS`     | build only                        | number of `next build` workers (set `1` on low-RAM machines; the Dockerfile does)       |
| `NEXT_SKIP_TYPECHECK` | build only                        | `1` skips the in-build typecheck (run `bun run typecheck` separately)                   |

There is deliberately **no `NEXT_PUBLIC_API_BASE_URL`**: the browser never calls the API directly. From Phase 2 the
browser calls the Next.js origin, which proxies `/api/v1/*` to the API (same-origin cookies, server ADR-018/020). Anything
prefixed `NEXT_PUBLIC_` is embedded in the browser bundle and must never hold secrets.

## Docker

`Dockerfile` (multi-stage): `oven/bun:1.3.14-slim` installs + builds, `node:24-slim` runs `server.js` as uid 1000
with a `/healthz` healthcheck. Normally built from the server repo:
`docker compose --profile web up -d --build web` → http://127.0.0.1:3100.

## Dependency audit

`bun run audit` ignores **GHSA-vfj7-8cjw-p6xm** (`braces` ≤ 3.0.3, DoS via nested patterns): it only reaches
build-time tooling (`shadcn` CLI, `@next/eslint-plugin-next` via fast-glob/micromatch), never the runtime bundle,
and no patched version exists (checked 2026-10-17). Remove the ignore when a fix is published.
