"use client"

import { apiRequest, type ApiRequestOptions, type ApiResponse } from "./client"
import { CSRF_COOKIE, CSRF_HEADER, isUnsafeMethod, readCookie } from "./csrf"
import { problemCode } from "./errors"
import type { CsrfResponse } from "./types"

/**
 * Same-origin path of the API as seen from the browser. Next.js proxies `/api/v1/*` to the
 * FastAPI service (src/app/api/v1/[...path]/route.ts), so cookies are first-party.
 */
export const BROWSER_API_BASE = "/api/v1"

export interface BrowserRequestOptions extends ApiRequestOptions {
  /** Read the CSRF cookie from this string instead of `document.cookie` (tests). */
  cookieString?: string
}

async function fetchCsrfToken(options: BrowserRequestOptions): Promise<string> {
  const { data } = await apiRequest<CsrfResponse>("/auth/csrf", {
    baseUrl: options.baseUrl ?? BROWSER_API_BASE,
    fetchImpl: options.fetchImpl,
    credentials: "include",
  })
  return data.csrf_token
}

async function send<T>(path: string, options: BrowserRequestOptions, token: string | null) {
  const { cookieString, headers, ...rest } = options
  void cookieString // only used for reading the CSRF cookie, not sent
  const finalHeaders = new Headers(headers)
  if (token) finalHeaders.set(CSRF_HEADER, token)
  return apiRequest<T>(path, {
    ...rest,
    baseUrl: options.baseUrl ?? BROWSER_API_BASE,
    credentials: "include",
    headers: finalHeaders,
  })
}

/**
 * Browser API call: always `credentials: "include"`; unsafe methods automatically carry the
 * CSRF header (fetching a token first if the cookie is missing). If the API answers
 * `csrf_failed` (e.g. the session changed in another tab), one fresh token is fetched and the
 * request retried once.
 */
export async function browserApi<T>(
  path: string,
  options: BrowserRequestOptions = {},
): Promise<ApiResponse<T>> {
  if (!isUnsafeMethod(options.method)) return send<T>(path, options, null)

  let token = readCookie(CSRF_COOKIE, options.cookieString)
  if (!token) token = await fetchCsrfToken(options)
  try {
    return await send<T>(path, options, token)
  } catch (error) {
    if (problemCode(error) !== "csrf_failed") throw error
    const fresh = await fetchCsrfToken(options)
    return send<T>(path, options, fresh)
  }
}
