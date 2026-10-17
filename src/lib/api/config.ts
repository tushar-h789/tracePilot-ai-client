/**
 * Single source of truth for the API base URL.
 *
 * - `API_BASE_URL` (server-only, read at request time): used by Server Components / route
 *   handlers. In Docker Compose it is `http://api:8000/api/v1`.
 * - No `NEXT_PUBLIC_*` API URL exists in Phase 1: the browser never calls the API directly.
 *   From Phase 2 the browser calls the Next.js origin, which proxies `/api/v1/*` (ADR-005).
 */
export const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1"

export function getApiBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("API_BASE_URL must be an absolute http(s) URL")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API_BASE_URL must use http or https")
  }
  return url.toString().replace(/\/+$/, "")
}
