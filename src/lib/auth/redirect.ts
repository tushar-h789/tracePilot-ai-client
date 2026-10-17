export const DEFAULT_AFTER_LOGIN = "/orgs"

/**
 * Only same-origin relative paths are accepted as a post-login destination (no open redirect):
 * must start with a single "/", no backslashes, no scheme-relative "//host".
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return DEFAULT_AFTER_LOGIN
  }
  if (raw.startsWith("/login") || raw.startsWith("/register")) return DEFAULT_AFTER_LOGIN
  return raw
}
