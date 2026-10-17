import { describe, expect, it, vi } from "vitest"

import { apiRequest, type FetchLike } from "@/lib/api/client"
import { getApiBaseUrl } from "@/lib/api/config"
import { type ApiError, isApiError } from "@/lib/api/errors"

const BASE = "http://api.test/api/v1"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (isApiError(error)) return error
    throw error
  }
  throw new Error("expected the request to fail")
}

describe("getApiBaseUrl", () => {
  it("defaults to the local API and trims trailing slashes", () => {
    expect(getApiBaseUrl({})).toBe("http://localhost:8000/api/v1")
    expect(getApiBaseUrl({ API_BASE_URL: "http://api:8000/api/v1///" })).toBe(
      "http://api:8000/api/v1",
    )
  })

  it("rejects non-http or malformed URLs", () => {
    expect(() => getApiBaseUrl({ API_BASE_URL: "not a url" })).toThrow(/absolute/)
    expect(() => getApiBaseUrl({ API_BASE_URL: "ftp://api/v1" })).toThrow(/http or https/)
  })
})

describe("apiRequest", () => {
  it("returns parsed JSON and sends JSON headers/body", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ status: "ok" }))
    const result = await apiRequest<{ status: string }>("/health/live", {
      baseUrl: BASE,
      fetchImpl,
      method: "POST",
      json: { a: 1 },
    })
    expect(result).toEqual({ status: 200, data: { status: "ok" } })
    const [url, init] = fetchImpl.mock.calls[0]!
    expect(url).toBe(`${BASE}/health/live`)
    const headers = new Headers(init?.headers)
    expect(headers.get("accept")).toBe("application/json")
    expect(headers.get("content-type")).toBe("application/json")
    expect(init?.body).toBe('{"a":1}')
    expect(init?.cache).toBe("no-store")
  })

  it("throws an http ApiError with status and body for non-2xx responses", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ detail: "nope" }, 404))
    const error = await captureError(apiRequest("/missing", { baseUrl: BASE, fetchImpl }))
    expect(error.kind).toBe("http")
    expect(error.status).toBe(404)
    expect(error.body).toEqual({ detail: "nope" })
  })

  it("returns typed data for explicitly accepted statuses", async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ status: "unavailable" }, 503))
    const result = await apiRequest("/health/ready", {
      baseUrl: BASE,
      fetchImpl,
      acceptStatuses: [503],
    })
    expect(result.status).toBe(503)
  })

  it("maps network failures to a network ApiError", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(new TypeError("fetch failed"))
    const error = await captureError(apiRequest("/x", { baseUrl: BASE, fetchImpl }))
    expect(error.kind).toBe("network")
    expect(error.message).not.toContain("fetch failed")
  })

  it("aborts slow requests with a timeout ApiError", async () => {
    const fetchImpl = vi.fn<FetchLike>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          )
        }),
    )
    const error = await captureError(
      apiRequest("/slow", { baseUrl: BASE, fetchImpl, timeoutMs: 20 }),
    )
    expect(error.kind).toBe("timeout")
  })

  it("maps invalid JSON to a parse ApiError", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response("<html>", { status: 200 }))
    const error = await captureError(apiRequest("/x", { baseUrl: BASE, fetchImpl }))
    expect(error.kind).toBe("parse")
  })

  it("reports a config ApiError when API_BASE_URL is invalid", async () => {
    vi.stubEnv("API_BASE_URL", "::bad::")
    try {
      const error = await captureError(apiRequest("/x", { fetchImpl: vi.fn<FetchLike>() }))
      expect(error.kind).toBe("config")
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
