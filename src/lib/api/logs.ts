import { browserApi, type BrowserRequestOptions } from "./browser"
import { buildQuery } from "./query"
import type { LogEventDetail, LogFacetsResponse, LogLevel, LogListResponse } from "./types"

const enc = encodeURIComponent

export interface TimeWindow {
  from?: string
  to?: string
}

export interface LogQueryParams extends TimeWindow {
  levels?: readonly LogLevel[]
  services?: readonly string[]
  environment?: string
  traceId?: string
  requestId?: string
  q?: string
  cursor?: string | null
  limit?: number
}

/** One page of logs (server-side filters, keyset cursor). Never fetches more than `limit`. */
export function listLogs(
  projectId: string,
  params: LogQueryParams,
  options: BrowserRequestOptions = {},
) {
  const qs = buildQuery({
    from: params.from,
    to: params.to,
    level: params.levels ?? [],
    service_name: params.services ?? [],
    environment: params.environment,
    trace_id: params.traceId,
    request_id: params.requestId,
    q: params.q,
    cursor: params.cursor,
    limit: params.limit,
  })
  return browserApi<LogListResponse>(`/projects/${enc(projectId)}/logs${qs}`, options)
}

export function getLog(projectId: string, logId: number, options: BrowserRequestOptions = {}) {
  return browserApi<LogEventDetail>(`/projects/${enc(projectId)}/logs/${logId}`, options)
}

export function getLogFacets(
  projectId: string,
  window: TimeWindow,
  options: BrowserRequestOptions = {},
) {
  const qs = buildQuery({ from: window.from, to: window.to })
  return browserApi<LogFacetsResponse>(`/projects/${enc(projectId)}/logs/facets${qs}`, options)
}
