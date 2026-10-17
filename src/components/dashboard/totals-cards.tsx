import { ActivityIcon, GaugeIcon, PercentIcon, XCircleIcon } from "lucide-react"

import { StatCard, StatCardSkeleton } from "@/components/metrics/stat-card"
import type { Totals } from "@/lib/api/types"
import { formatCount, formatMs, formatPercent } from "@/lib/format"
import { nullReasonText } from "@/lib/metric-docs"

/** The four headline cards shared by the org dashboard and the project overview. */
export function TotalsCards({ totals }: { totals: Totals }) {
  const lat = totals.latency
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Requests"
        metric="requests"
        icon={<ActivityIcon aria-hidden="true" className="size-3.5" />}
        value={formatCount(totals.requests)}
        hint={`${formatCount(totals.events)} events in total`}
      />
      <StatCard
        label="Errors"
        metric="errors"
        icon={<XCircleIcon aria-hidden="true" className="size-3.5" />}
        value={formatCount(totals.errors)}
        tone={totals.errors > 0 ? "danger" : "default"}
        hint={`${formatCount(totals.request_errors)} of them on requests`}
      />
      <StatCard
        label="Error rate"
        metric="errorRate"
        icon={<PercentIcon aria-hidden="true" className="size-3.5" />}
        value={totals.error_rate === null ? null : formatPercent(totals.error_rate)}
        nullReason={nullReasonText(totals.error_rate_reason)}
        tone={totals.error_rate !== null && totals.error_rate >= 0.05 ? "danger" : "default"}
        hint={`${formatCount(totals.request_errors)} / ${formatCount(totals.requests)} requests`}
      />
      <StatCard
        label="p95 latency"
        metric="latency"
        icon={<GaugeIcon aria-hidden="true" className="size-3.5" />}
        value={lat.p95_ms === null ? null : formatMs(lat.p95_ms)}
        nullReason={nullReasonText(lat.reason, lat.samples, lat.min_samples)}
        hint={
          lat.p50_ms !== null && lat.p99_ms !== null
            ? `p50 ${formatMs(lat.p50_ms)} · p99 ${formatMs(lat.p99_ms)} · ${formatCount(lat.samples)} samples`
            : undefined
        }
      />
    </div>
  )
}

export function TotalsCardsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading metrics"
    >
      {[0, 1, 2, 3].map((i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}
