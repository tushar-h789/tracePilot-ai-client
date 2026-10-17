import { cookies } from "next/headers"

import { apiRequest } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import type { MeResponse } from "@/lib/api/types"

import { SESSION_COOKIE_NAMES } from "./session-cookie"

/**
 * Server-side session check for rendering (UX only — the API is the security boundary and
 * re-validates the session on every request). Forwards only the session cookie to GET /auth/me.
 * Returns null when there is no valid session; throws for other failures (API down).
 */
export async function getCurrentUser(): Promise<MeResponse | null> {
  const jar = await cookies()
  const cookie = SESSION_COOKIE_NAMES.map((name) => jar.get(name)).find(Boolean)
  if (!cookie) return null
  try {
    const { data } = await apiRequest<MeResponse>("/auth/me", {
      headers: { cookie: `${cookie.name}=${cookie.value}` },
      timeoutMs: 3000,
    })
    return data
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null
    throw error
  }
}
