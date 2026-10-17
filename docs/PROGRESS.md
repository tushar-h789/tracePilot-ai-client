# TracePilot AI Client — Progress Notes

The **canonical documentation** (requirements, architecture, security, testing, ADRs, phase plan) lives in the
server repo: https://github.com/tushar-h789/tracePilot-ai-server/tree/main/docs (Phase 0 branch:
https://github.com/tushar-h789/tracePilot-ai-server/tree/phase-0/discovery/docs). This file only records
client-specific notes.

## Phase 0 — 2026-10-17 (Asia/Dhaka, UTC+6)
- Status: complete (docs only). No `package.json`, no app code.
- Repo initialised locally as its own git repository (the parent home directory is an unrelated repo).
- Branch `phase-0/discovery` pushed; `main` exists only locally.

## UI pages (MVP)
| Page | Route (proposed) | Notes |
|---|---|---|
| Login / Register | `/login`, `/register` | RHF + Zod; generic auth errors; no client-side token storage (HttpOnly cookies) |
| Org / project selection | `/orgs` | Create org, pick org + project; last choice remembered client-side only |
| Overview dashboard | `/o/[orgSlug]/p/[projectSlug]/overview` | KPI cards (volume, error rate, p50/p95), Recharts time series, open incidents |
| Logs explorer | `…/logs` | Time range (required), level/service/status/path/trace filters, search, cursor pagination, detail drawer |
| Incident list | `…/incidents` | Status/severity/service filters |
| Incident detail + AI investigation | `…/incidents/[id]` | Rule + metric snapshot, related logs, timeline, ack/resolve, "Run AI investigation", status polling, hypotheses with clickable evidence ids, limitations, model id + disclaimer |
| Project settings + ingestion keys | `…/settings` | Retention days, rules, keys (create shows secret once with copy button, revoke, rotate) |
| Org / team settings | `/o/[orgSlug]/settings` | Members, roles, org name |

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
