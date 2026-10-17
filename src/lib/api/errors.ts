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
