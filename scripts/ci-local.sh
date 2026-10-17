#!/usr/bin/env bash
# Run the same checks as .github/workflows/ci.yml, locally.
#   ./scripts/ci-local.sh            # all steps; E2E needs the API stack running:
#     (cd ../tracePilot-ai-server && docker compose up -d && docker compose run --rm migrate)
#   SKIP_E2E=1 ./scripts/ci-local.sh
#   NEXT_BUILD_CPUS=1 NEXT_SKIP_TYPECHECK=1 ./scripts/ci-local.sh   # low-RAM build (typecheck still runs)
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
  step "playwright e2e (real API)"
  api="${API_BASE_URL:-http://localhost:8000/api/v1}"
  if ! curl -fsS "$api/health/ready" >/dev/null; then
    echo "API not ready at $api — start the server stack or set SKIP_E2E=1" >&2
    exit 1
  fi
  bun run test:e2e
fi
step "all checks passed"
