/**
 * Contract drift check (ADR-012): regenerate API types from the server's committed OpenAPI
 * document and fail if they differ from src/lib/api/schema.d.ts.
 *
 *   bun run check:api                      # uses ../tracePilot-ai-server/openapi/openapi.json
 *   OPENAPI_SPEC=path/or/url bun run check:api
 */
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const spec = process.env.OPENAPI_SPEC ?? "../tracePilot-ai-server/openapi/openapi.json"
const committed = "src/lib/api/schema.d.ts"
const dir = mkdtempSync(join(tmpdir(), "tp-api-"))
const out = join(dir, "schema.d.ts")

try {
  const gen = spawnSync("bun", ["x", "openapi-typescript", spec, "-o", out], {
    stdio: ["ignore", "ignore", "inherit"],
  })
  if (gen.status !== 0) process.exit(gen.status ?? 1)

  // Format as if the file lived at its committed path, so the project's Prettier config applies.
  const fmt = spawnSync("bun", ["x", "prettier", "--stdin-filepath", committed], {
    input: readFileSync(out, "utf8"),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  })
  if (fmt.status !== 0) process.exit(fmt.status ?? 1)

  if (fmt.stdout !== readFileSync(committed, "utf8")) {
    console.error(`${committed} is out of date with ${spec}. Run: bun run gen:api`)
    process.exit(1)
  }
  console.log(`${committed} matches ${spec}`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
