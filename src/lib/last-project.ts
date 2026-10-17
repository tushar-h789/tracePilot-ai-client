/** Remember the last opened project per browser (UX only; the server authorizes every call). */
export const LAST_PROJECT_KEY = "tp:last-project"

export interface LastProject {
  orgId: string
  projectId: string
}

export function rememberProject(value: LastProject): void {
  try {
    window.localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify(value))
  } catch {
    // storage unavailable: ignore
  }
}

export function lastProject(): LastProject | null {
  try {
    const raw = window.localStorage.getItem(LAST_PROJECT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as LastProject).orgId === "string" &&
      typeof (parsed as LastProject).projectId === "string"
    ) {
      return parsed as LastProject
    }
  } catch {
    // corrupt value: ignore
  }
  return null
}
