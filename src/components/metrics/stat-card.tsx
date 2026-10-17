import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { MetricKey } from "@/lib/metric-docs"
import { cn } from "@/lib/utils"

import { MetricInfo } from "./metric-info"

export type StatTone = "default" | "danger" | "warning" | "success"

/**
 * One headline number. `value === null` renders "—" plus `nullReason`, never a fake 0.
 */
export function StatCard({
  label,
  metric,
  value,
  nullReason,
  hint,
  tone = "default",
  icon,
}: {
  label: string
  metric: MetricKey
  value: string | null
  nullReason?: string
  hint?: ReactNode
  tone?: StatTone
  icon?: ReactNode
}) {
  const id = `stat-${metric}-${label.replace(/\W+/g, "-").toLowerCase()}`
  return (
    <Card size="sm" aria-labelledby={id} role="group" data-testid={`stat-${metric}`}>
      <CardContent className="space-y-1">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {icon}
          <span id={id}>{label}</span>
          <MetricInfo metric={metric} label={label} />
        </div>
        {value === null ? (
          <>
            <p
              className="text-2xl font-semibold tabular-nums"
              aria-label={`${label}: not available`}
            >
              —
            </p>
            <p className="text-xs text-muted-foreground">{nullReason ?? "Not enough data."}</p>
          </>
        ) : (
          <>
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                tone === "danger" && "text-danger",
                tone === "warning" && "text-warning",
                tone === "success" && "text-success",
              )}
            >
              {value}
            </p>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card size="sm" aria-hidden="true">
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}
