import { getApiBaseUrl } from "./config"
import { ApiError } from "./errors"

export const DEFAULT_TIMEOUT_MS = 5000

/** Minimal fetch signature (injectable for tests). */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "signal"> {
  /** JSON-serialisable request body. */
  json?: unknown
  /** Abort the request after this many milliseconds (default 5000). */
  timeoutMs?: number
  /** Non-2xx statuses whose JSON body is still a valid typed response (e.g. 503 readiness). */
  acceptStatuses?: readonly number[]
  baseUrl?: string
  fetchImpl?: FetchLike
  signal?: AbortSignal
}

export interface ApiResponse<T> {
  status: number
  data: T
}

/**
 * Typed fetch wrapper: JSON in/out, timeout, and a single `ApiError` type for every failure.
 * Callers pass the expected response type, normally derived from the generated OpenAPI types.
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    json,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    acceptStatuses = [],
    baseUrl,
    fetchImpl = fetch,
    signal,
    headers,
    ...init
  } = options

  let base: string
  try {
    base = baseUrl ?? getApiBaseUrl()
  } catch (cause) {
    throw new ApiError("config", "The API address is misconfigured.", { cause })
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`

  const timeout = AbortSignal.timeout(timeoutMs)
  const finalSignal = signal ? AbortSignal.any([signal, timeout]) : timeout

  const requestHeaders = new Headers(headers)
  requestHeaders.set("Accept", "application/json")
  if (json !== undefined) requestHeaders.set("Content-Type", "application/json")

  let response: Response
  try {
    response = await fetchImpl(url, {
      ...init,
      headers: requestHeaders,
      body: json === undefined ? undefined : JSON.stringify(json),
      signal: finalSignal,
      cache: init.cache ?? "no-store",
    })
  } catch (cause) {
    if (timeout.aborted) {
      throw new ApiError("timeout", `The API did not respond within ${timeoutMs} ms.`, { cause })
    }
    throw new ApiError("network", "The API could not be reached.", { cause })
  }

  const text = await response.text()
  let body: unknown = undefined
  if (text) {
    try {
      body = JSON.parse(text)
    } catch (cause) {
      throw new ApiError("parse", "The API returned an invalid response.", {
        status: response.status,
        cause,
      })
    }
  }

  if (!response.ok && !acceptStatuses.includes(response.status)) {
    throw new ApiError("http", `The API responded with status ${response.status}.`, {
      status: response.status,
      body,
    })
  }
  return { status: response.status, data: body as T }
}
