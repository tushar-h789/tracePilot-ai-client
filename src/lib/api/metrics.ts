import { browserApi, type BrowserRequestOptions } from "./browser"
import type { TimeWindow } from "./logs"
import { buildQuery } from "./query"
import type {
  OrgSummaryResponse,
  ProjectOverviewResponse,
  RecentErrorsResponse,
  ServicesResponse,
  TimeseriesResponse,
} from "./types"

const enc = encodeURIComponent
const range = (w: TimeWindow) => buildQuery({ from: w.from, to: w.to })

export function getProjectOverview(
  projectId: string,
  w: TimeWindow,
  o: BrowserRequestOptions = {},
) {
  return browserApi<ProjectOverviewResponse>(
    `/projects/${enc(projectId)}/metrics/overview${range(w)}`,
    o,
  )
}

export function getProjectTimeseries(
  projectId: string,
  w: TimeWindow,
  o: BrowserRequestOptions = {},
) {
  return browserApi<TimeseriesResponse>(
    `/projects/${enc(projectId)}/metrics/timeseries${range(w)}`,
    o,
  )
}

export function getProjectServices(
  projectId: string,
  w: TimeWindow,
  o: BrowserRequestOptions = {},
) {
  return browserApi<ServicesResponse>(`/projects/${enc(projectId)}/metrics/services${range(w)}`, o)
}

export function getRecentErrors(
  projectId: string,
  w: TimeWindow,
  limit = 10,
  o: BrowserRequestOptions = {},
) {
  const qs = buildQuery({ from: w.from, to: w.to, limit })
  return browserApi<RecentErrorsResponse>(
    `/projects/${enc(projectId)}/metrics/recent-errors${qs}`,
    o,
  )
}

export function getOrgSummary(orgId: string, w: TimeWindow, o: BrowserRequestOptions = {}) {
  return browserApi<OrgSummaryResponse>(
    `/organizations/${enc(orgId)}/metrics/summary${range(w)}`,
    o,
  )
}

export function getOrgTimeseries(orgId: string, w: TimeWindow, o: BrowserRequestOptions = {}) {
  return browserApi<TimeseriesResponse>(
    `/organizations/${enc(orgId)}/metrics/timeseries${range(w)}`,
    o,
  )
}
