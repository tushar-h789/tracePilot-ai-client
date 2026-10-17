#!/usr/bin/env bash
# Run the same checks as .github/workflows/ci.yml, locally.
#   ./scripts/ci-local.sh            # all steps (Playwright smoke if Chromium is installed)
#   SKIP_E2E=1 ./scripts/ci-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."
step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

export NEXT_TELEMETRY_DISABLED=1
step "bun install --frozen-lockfile"; bun install --frozen-lockfile
step "prettier --check";               bun run format:check
step "eslint";                         bun run lint
step "typecheck (tsc --noEmit)";       bun run typecheck
step "vitest";                         bun run test:coverage
step "API contract drift";             bun run check:api
step "dependency audit";               bun run audit
step "next build";                     bun run build
if [[ "${SKIP_E2E:-0}" != "1" ]]; then
  step "playwright smoke";             bun run test:e2e
fi
step "all checks passed"
