import { NextResponse, type NextRequest } from "next/server"

import { isProtectedPath, SESSION_COOKIE_NAMES } from "@/lib/auth/session-cookie"

/**
 * Optimistic redirect only: no session cookie -> /login. It does NOT validate the session (the
 * (app) layout calls GET /auth/me, and the API checks every request). Never a security boundary.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (!isProtectedPath(pathname)) return NextResponse.next()
  const hasSession = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name))
  if (hasSession) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.search = `?next=${encodeURIComponent(pathname + search)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/logs/:path*",
    "/incidents/:path*",
    "/settings/:path*",
    "/orgs/:path*",
  ],
}
