import type { NextRequest } from "next/server"

import { getApiBaseUrl } from "@/lib/api/config"

/**
 * Same-origin proxy: browser -> Next.js (/api/v1/*) -> FastAPI (API_BASE_URL, read at request
 * time). Keeps session/CSRF cookies first-party on the web origin, so no cross-site cookies
 * and minimal CORS. Only an allowlist of headers is forwarded in each direction.
 */
const REQUEST_HEADERS = [
  "accept",
  "content-type",
  "cookie",
  "origin",
  "user-agent",
  "x-csrf-token",
  "x-request-id",
  "x-forwarded-for",
] as const
const RESPONSE_HEADERS = ["content-type", "cache-control", "retry-after", "x-request-id"] as const
const MAX_BODY_BYTES = 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 15_000

function problem(status: number, title: string, detail: string): Response {
  return Response.json(
    { type: "about:blank", title, status, detail },
    {
      status,
      headers: { "content-type": "application/problem+json", "cache-control": "no-store" },
    },
  )
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params
  if (path.length === 0 || path.some((s) => s === "" || s === "." || s === "..")) {
    return problem(404, "Not Found", "Not Found")
  }

  let base: string
  try {
    base = getApiBaseUrl()
  } catch {
    return problem(502, "Bad Gateway", "The API address is misconfigured.")
  }
  const target = `${base}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`

  const headers = new Headers()
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  let body: ArrayBuffer | undefined
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return problem(413, "Content Too Large", "The request body is too large.")
    }
    body = await request.arrayBuffer()
    if (body.byteLength > MAX_BODY_BYTES) {
      return problem(413, "Content Too Large", "The request body is too large.")
    }
  }

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch {
    return problem(502, "Bad Gateway", "The API could not be reached.")
  }

  const out = new Headers()
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) out.set(name, value)
  }
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie)
  if (!out.has("cache-control")) out.set("cache-control", "no-store")

  const hasBody = upstream.status !== 204 && upstream.status !== 304
  return new Response(hasBody ? await upstream.arrayBuffer() : null, {
    status: upstream.status,
    headers: out,
  })
}

export { proxy as DELETE, proxy as GET, proxy as PATCH, proxy as POST, proxy as PUT }
