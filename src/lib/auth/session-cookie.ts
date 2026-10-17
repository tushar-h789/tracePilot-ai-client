/** Session cookie names set by the API (`__Host-` prefix only over HTTPS, COOKIE_SECURE=true). */
export const SESSION_COOKIE_NAMES = ["tp_session", "__Host-tp_session"] as const

export const PROTECTED_PREFIXES = [
  "/overview",
  "/logs",
  "/incidents",
  "/settings",
  "/orgs",
] as const

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
