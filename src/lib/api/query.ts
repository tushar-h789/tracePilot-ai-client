export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | readonly string[]>

/** Build `?a=1&level=error&level=warning`; arrays repeat the key, empty values are dropped. */
export function buildQuery(params: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) if (item !== "") search.append(key, item)
    } else if (value !== undefined && value !== null && value !== false && value !== "") {
      search.set(key, String(value))
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ""
}
