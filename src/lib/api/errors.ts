export type ApiErrorKind = "http" | "timeout" | "network" | "parse" | "config"

/** Standard error for every API call. `message` is safe to show; raw details stay internal. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly body: unknown

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number; body?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = "ApiError"
    this.kind = kind
    this.status = options.status ?? null
    this.body = options.body
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

interface ProblemLike {
  detail?: unknown
  code?: unknown
  errors?: unknown
}

function asProblem(body: unknown): ProblemLike | null {
  return body && typeof body === "object" ? (body as ProblemLike) : null
}

/** Machine-readable problem code from the API (e.g. "csrf_failed", "rate_limited"). */
export function problemCode(error: unknown): string | null {
  if (!isApiError(error)) return null
  const code = asProblem(error.body)?.code
  return typeof code === "string" ? code : null
}

/** Field-level validation messages from a problem+json body, keyed by the last `loc` part. */
export function problemFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (!isApiError(error)) return result
  const errors = asProblem(error.body)?.errors
  if (!Array.isArray(errors)) return result
  for (const item of errors) {
    if (!item || typeof item !== "object") continue
    const { loc, msg } = item as { loc?: unknown; msg?: unknown }
    const field = Array.isArray(loc) ? String(loc[loc.length - 1]) : ""
    if (field && typeof msg === "string" && !result[field]) result[field] = msg
  }
  return result
}

/**
 * A safe, user-facing message. Uses the API's `detail` for expected 4xx answers (those are
 * written to be shown) and generic text otherwise. Never exposes stack traces or raw bodies.
 */
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!isApiError(error)) return fallback
  if (error.kind !== "http") return error.message
  if (error.status === 429) {
    return "Too many attempts. Please wait a moment and try again."
  }
  const detail = asProblem(error.body)?.detail
  if (error.status && error.status < 500 && typeof detail === "string" && detail) return detail
  return fallback
}
