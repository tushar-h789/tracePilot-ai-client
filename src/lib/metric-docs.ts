/**
 * Plain-language metric definitions shown in tooltips. The normative source is the server's
 * docs/METRICS.md; keep these in sync with it.
 */
export const METRICS_DOC_URL =
  "https://github.com/tushar-h789/tracePilot-ai-server/blob/main/docs/METRICS.md"

export const METRIC_DEFINITIONS = {
  events: "Every log event whose timestamp falls in the selected range.",
  requests: "Events that carry an HTTP status code. Plain application logs are not requests.",
  errors: "Events with level error or critical, or with an HTTP status of 500 or higher.",
  errorRate:
    "Requests that are errors divided by all requests. HTTP 4xx responses are not errors. Shown as — when there are no requests.",
  latency:
    "Continuous percentile (percentile_cont) of duration_ms over requests that report a duration. Shown as — below the minimum sample size.",
  services: "Per service_name: requests, errors, error rate and p95 latency in the range.",
  incidents: "Incident detection arrives in Phase 5.",
} as const

export type MetricKey = keyof typeof METRIC_DEFINITIONS

export const NULL_REASONS: Record<string, string> = {
  no_requests: "No requests in this range, so there is nothing to divide by.",
  no_latency_samples: "No requests with a duration in this range.",
  insufficient_samples: "Too few requests with a duration to compute a reliable percentile.",
}

export function nullReasonText(reason: string | null | undefined, samples?: number, min?: number) {
  if (reason === "insufficient_samples" && samples !== undefined && min !== undefined) {
    return `Only ${samples} of the ${min} samples needed for a reliable percentile.`
  }
  return (reason && NULL_REASONS[reason]) ?? "Not enough data in this range."
}
