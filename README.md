# TracePilot AI — Client

Next.js web application for **TracePilot AI**, an AI-assisted application observability and incident
investigation platform (portfolio MVP): logs explorer, request/error/latency dashboards, rule-based incidents
and background AI investigations with validated evidence.

> Status: **Phase 0 — discovery (docs only).** No application code yet.

- API, worker, Docker Compose stack and the **canonical project documentation** live in the server repo:
  [tracePilot-ai-server → docs/](https://github.com/tushar-h789/tracePilot-ai-server/tree/main/docs)
  (during Phase 0 the docs are on branch
  [`phase-0/discovery`](https://github.com/tushar-h789/tracePilot-ai-server/tree/phase-0/discovery/docs)).
- Client-specific notes: [docs/PROGRESS.md](docs/PROGRESS.md).

## Planned stack
Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · React Hook Form + Zod · Recharts ·
Vitest + React Testing Library · Playwright · npm. API types generated from the server's OpenAPI schema.

## Local layout
```
tracePilot-ai/
  tracePilot-ai-server/   # docker-compose.yml can build this app from ../tracePilot-ai-client
  tracePilot-ai-client/   # this repo
```
Setup instructions arrive in Phase 1.
