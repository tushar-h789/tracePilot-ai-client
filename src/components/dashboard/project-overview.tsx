"use client"

import { ActivityIcon, RefreshCwIcon, ScrollTextIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { type Column, SortableTable } from "@/components/data-table/sortable-table"
import { EmptyState } from "@/components/empty-state"
import { projectPaths } from "@/components/layout/nav-items"
import { PageHeader } from "@/components/layout/page-header"
import { MetricInfo } from "@/components/metrics/metric-info"
import {
  COUNT_SERIES,
  LATENCY_SERIES,
  TimeseriesChart,
} from "@/components/metrics/timeseries-chart"
import { QueryError } from "@/components/query-error"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkspace } from "@/components/workspace/workspace-context"
import {
  getProjectOverview,
  getProjectServices,
  getProjectTimeseries,
  getRecentErrors,
} from "@/lib/api/metrics"
import type {
  ProjectOverviewResponse,
  RecentErrorsResponse,
  ServicesResponse,
  ServiceSummary,
  TimeseriesResponse,
} from "@/lib/api/types"
import { formatCount, formatMs, formatPercent } from "@/lib/format"
import { describeRange, resolveRange } from "@/lib/time-range"
import { useApiQuery } from "@/lib/use-api-query"

import { IncidentsPlaceholder } from "./incidents-placeholder"
import { IngestGuidance } from "./ingest-guidance"
import { RangePicker } from "./range-picker"
import { RecentErrorsList } from "./recent-errors-list"
import { TotalsCards, TotalsCardsSkeleton } from "./totals-cards"
import { useRangeParam } from "./use-url-state"

interface Loaded {
  overview: ProjectOverviewResponse
  series: TimeseriesResponse
  services: ServicesResponse
  errors: RecentErrorsResponse
}

const SERVICE_COLUMNS: Column<ServiceSummary>[] = [
  {
    id: "service",
    header: "Service",
    cell: (s) => <span className="font-medium">{s.service_name}</span>,
    sortValue: (s) => s.service_name,
  },
  {
    id: "requests",
    header: "Requests",
    cell: (s) => formatCount(s.requests),
    sortValue: (s) => s.requests,
    align: "right",
  },
  {
    id: "errors",
    header: "Errors",
    cell: (s) => formatCount(s.errors),
    sortValue: (s) => s.errors,
    align: "right",
  },
  {
    id: "error_rate",
    header: "Error rate",
    cell: (s) =>
      s.error_rate === null ? <span title="No requests">—</span> : formatPercent(s.error_rate),
    sortValue: (s) => s.error_rate,
    align: "right",
  },
  {
    id: "p95",
    header: "p95",
    cell: (s) =>
      s.p95_ms === null ? (
        <span title={`${s.samples} samples (minimum 20)`}>—</span>
      ) : (
        formatMs(s.p95_ms)
      ),
    sortValue: (s) => s.p95_ms,
    align: "right",
  },
]

export function ProjectOverview({ orgId, projectId }: { orgId: string; projectId: string }) {
  const { range, setRange } = useRangeParam()
  const { project } = useWorkspace()
  const [nonce, setNonce] = useState(0)
  const paths = projectPaths(orgId, projectId)
  const { state, reload } = useApiQuery<Loaded>(
    async () => {
      const window = resolveRange(range)
      const [overview, series, services, errors] = await Promise.all([
        getProjectOverview(projectId, window),
        getProjectTimeseries(projectId, window),
        getProjectServices(projectId, window),
        getRecentErrors(projectId, window, 10),
      ])
      return {
        overview: overview.data,
        series: series.data,
        services: services.data,
        errors: errors.data,
      }
    },
    `${projectId}:${JSON.stringify(range)}:${nonce}`,
  )

  const header = (
    <PageHeader
      title={project ? `${project.name} · Overview` : "Project overview"}
      description={`Requests, errors and latency · ${describeRange(range)}`}
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <RangePicker value={range} onChange={setRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNonce((n) => n + 1)}
            aria-label="Refresh metrics"
          >
            <RefreshCwIcon aria-hidden="true" />
          </Button>
        </div>
      }
    />
  )

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        {header}
        <TotalsCardsSkeleton />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (state.status === "error") {
    return (
      <div className="space-y-4">
        {header}
        <QueryError
          error={state.error}
          onRetry={reload}
          fallback="Could not load metrics."
          notFoundTitle="Project not found"
        >
          <Link href={`/orgs/${orgId}/projects`} className={buttonVariants({ variant: "outline" })}>
            All projects
          </Link>
        </QueryError>
      </div>
    )
  }

  const { overview, series, services, errors } = state.data
  if (overview.totals.events === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={ActivityIcon}
          title="No logs in this range"
          description="Nothing was ingested for this project in the selected time range. Pick a longer range or send some logs."
        >
          <IngestGuidance settingsHref={paths.settings} />
        </EmptyState>
        <IncidentsPlaceholder />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}
      <TotalsCards totals={overview.totals} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card size="sm">
          <CardContent>
            <TimeseriesChart
              title="Requests and errors"
              points={series.points}
              bucketSeconds={series.bucket_seconds}
              series={COUNT_SERIES}
            />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <TimeseriesChart
              title={`p95 latency (buckets with at least ${series.min_samples} samples)`}
              points={series.points}
              bucketSeconds={series.bucket_seconds}
              series={LATENCY_SERIES}
            />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              Services <MetricInfo metric="services" label="Services" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SortableTable
              caption="Per-service metrics"
              columns={SERVICE_COLUMNS}
              rows={services.items}
              rowKey={(s) => s.service_name}
              initialSort={{ id: "requests", direction: "descending" }}
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent errors</CardTitle>
              <Link
                href={`${paths.logs}?level=error&level=critical`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <ScrollTextIcon aria-hidden="true" />
                View in logs
              </Link>
            </CardHeader>
            <CardContent>
              <RecentErrorsList items={errors.items} hrefFor={(e) => `${paths.logs}?log=${e.id}`} />
            </CardContent>
          </Card>
          <IncidentsPlaceholder />
        </div>
      </div>
    </div>
  )
}
