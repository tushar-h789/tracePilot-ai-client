import type { LogEventDetail, LogEventSummary, Totals, TimeseriesPoint } from "@/lib/api/types"

export const log = (id: number, over: Partial<LogEventSummary> = {}): LogEventSummary => ({
  id,
  event_id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  timestamp: new Date(Date.UTC(2026, 9, 17, 8, 0, 0) - id * 1000).toISOString(),
  level: "info",
  service_name: "api",
  environment: "production",
  message: `message ${id}`,
  trace_id: null,
  request_id: null,
  http_method: null,
  http_path: null,
  http_status: null,
  duration_ms: null,
  is_synthetic: true,
  ...over,
})

export const detail = (id: number, over: Partial<LogEventDetail> = {}): LogEventDetail => ({
  ...log(id),
  received_at: "2026-10-17T08:00:01Z",
  attributes: {},
  ...over,
})

export const totals = (over: Partial<Totals> = {}): Totals => ({
  events: 120,
  requests: 100,
  errors: 7,
  request_errors: 5,
  error_rate: 0.05,
  error_rate_reason: null,
  latency: {
    p50_ms: 40,
    p95_ms: 180.5,
    p99_ms: 900,
    samples: 100,
    min_samples: 20,
    reason: null,
  },
  ...over,
})

export const point = (i: number, over: Partial<TimeseriesPoint> = {}): TimeseriesPoint => ({
  bucket_start: new Date(Date.UTC(2026, 9, 17, 8, i * 15)).toISOString(),
  events: 10,
  requests: 8,
  errors: 1,
  request_errors: 1,
  samples: 8,
  p95_ms: 120,
  ...over,
})
