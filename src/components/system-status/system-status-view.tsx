import { CheckCircle2Icon, CircleAlertIcon, PlugZapIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { SystemStatus } from "@/lib/api/health"

const CHECK_LABELS = { database: "Database (PostgreSQL)", redis: "Queue (Redis)" } as const

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800"
          : "inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800"
      }
    >
      {ok ? (
        <CheckCircle2Icon aria-hidden="true" className="size-3" />
      ) : (
        <CircleAlertIcon aria-hidden="true" className="size-3" />
      )}
      {label}
    </span>
  )
}

export function SystemStatusSkeleton() {
  return (
    <Card aria-busy="true" aria-label="System status loading">
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>Checking API dependencies…</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-40" />
      </CardContent>
    </Card>
  )
}

/** Pure presentational component: easy to test in every state. */
export function SystemStatusView({ status }: { status: SystemStatus }) {
  if (status.state === "unreachable") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>Live result of GET /api/v1/health/ready</CardDescription>
        </CardHeader>
        <CardContent className="flex items-start gap-2 text-sm" role="status">
          <PlugZapIcon aria-hidden="true" className="mt-0.5 size-4 text-red-700" />
          <div>
            <p className="font-medium">API unreachable</p>
            <p className="text-muted-foreground">{status.reason}</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  const { readiness } = status
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          System status
          <StatusPill
            ok={status.state === "ok"}
            label={status.state === "ok" ? "All systems ready" : "Degraded"}
          />
        </CardTitle>
        <CardDescription>Live result of GET /api/v1/health/ready</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm" role="status">
          {(Object.keys(CHECK_LABELS) as (keyof typeof CHECK_LABELS)[]).map((name) => {
            const check = readiness.checks[name]
            return (
              <li key={name} className="flex items-center justify-between gap-4">
                <span>{CHECK_LABELS[name]}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {check.latency_ms.toFixed(1)} ms
                  </span>
                  <StatusPill
                    ok={check.status === "ok"}
                    label={check.status === "ok" ? "OK" : "Error"}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
