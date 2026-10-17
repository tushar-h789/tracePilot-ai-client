/**
 * CSRF double-submit helpers (browser only).
 *
 * The API sets a readable `tp_csrf` cookie (signed, bound to the session); unsafe requests must
 * echo it in `X-CSRF-Token`. The session cookie itself is HttpOnly and never visible to JS.
 * Nothing is stored in localStorage/sessionStorage.
 */
export const CSRF_COOKIE = "tp_csrf"
export const CSRF_HEADER = "X-CSRF-Token"
export const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function readCookie(name: string, cookieString?: string): string | null {
  const source = cookieString ?? (typeof document === "undefined" ? "" : document.cookie)
  for (const part of source.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=")
    if (rawKey === name) {
      const value = rest.join("=")
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }
  }
  return null
}

export function isUnsafeMethod(method: string | undefined): boolean {
  return UNSAFE_METHODS.has((method ?? "GET").toUpperCase())
}
