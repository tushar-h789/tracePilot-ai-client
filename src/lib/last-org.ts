/**
 * FR-07: remember the last selected organization *client-side* (UX only; the server never
 * trusts it). Only a non-secret organization id is stored — never tokens or session data.
 */
export const LAST_ORG_KEY = "tp:last-org-id"

export function rememberOrg(orgId: string): void {
  try {
    window.localStorage.setItem(LAST_ORG_KEY, orgId)
  } catch {
    // storage unavailable (private mode): ignore
  }
}

export function lastOrg(): string | null {
  try {
    return window.localStorage.getItem(LAST_ORG_KEY)
  } catch {
    return null
  }
}
