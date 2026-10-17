import type { LogLevel } from "@/lib/api/types"
import { parseRange, type RangeSelection } from "@/lib/time-range"

import { LEVELS } from "./level-badge"

/** Filters as stored in the URL (`?level=error&service=api&q=timeout&trace=...`). */
export interface LogFilterState {
  range: RangeSelection
  levels: LogLevel[]
  services: string[]
  environment: string
  traceId: string
  requestId: string
  q: string
}

export const MAX_Q = 200

export function parseLogFilters(params: URLSearchParams): LogFilterState {
  const levels = params
    .getAll("level")
    .filter((l): l is LogLevel => (LEVELS as readonly string[]).includes(l))
  return {
    range: parseRange(params),
    levels: [...new Set(levels)],
    services: [...new Set(params.getAll("service").filter(Boolean))].slice(0, 20),
    environment: params.get("env") ?? "",
    traceId: params.get("trace") ?? "",
    requestId: params.get("request") ?? "",
    q: (params.get("q") ?? "").slice(0, MAX_Q),
  }
}

export function hasActiveFilters(f: LogFilterState): boolean {
  return (
    f.levels.length > 0 ||
    f.services.length > 0 ||
    !!f.environment ||
    !!f.traceId ||
    !!f.requestId ||
    !!f.q
  )
}

export const CLEARED_FILTERS = {
  level: undefined,
  service: undefined,
  env: undefined,
  trace: undefined,
  request: undefined,
  q: undefined,
}
