import { apiRequest, type ApiRequestOptions } from "./client"
import { ApiError } from "./errors"
import type { ReadinessResponse } from "./types"

export type SystemStatus =
  | { state: "ok"; readiness: ReadinessResponse }
  | { state: "degraded"; readiness: ReadinessResponse }
  | { state: "unreachable"; reason: string }

/** Calls GET /health/ready. 503 is an expected, typed answer ("degraded"), not an exception. */
export async function getSystemStatus(options: ApiRequestOptions = {}): Promise<SystemStatus> {
  try {
    const { data } = await apiRequest<ReadinessResponse>("/health/ready", {
      timeoutMs: 3000,
      acceptStatuses: [503],
      ...options,
    })
    return data.status === "ok"
      ? { state: "ok", readiness: data }
      : { state: "degraded", readiness: data }
  } catch (error) {
    if (error instanceof ApiError) return { state: "unreachable", reason: error.message }
    throw error
  }
}
