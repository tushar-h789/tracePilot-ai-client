"use client"

import { FolderKanbanIcon, RefreshCwIcon } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"

import { type Column, SortableTable } from "@/components/data-table/sortable-table"
import { EmptyState } from "@/components/empty-state"
import { orgPaths, projectPaths } from "@/components/layout/nav-items"
import { PageHeader } from "@/components/layout/page-header"
import { COUNT_SERIES, TimeseriesChart } from "@/components/metrics/timeseries-chart"
import { QueryError } from "@/components/query-error"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getOrgSummary, getOrgTimeseries } from "@/lib/api/metrics"
import type { OrgSummaryResponse, ProjectSummary, TimeseriesResponse } from "@/lib/api/types"
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
  summary: OrgSummaryResponse
  series: TimeseriesResponse
}

function projectColumns(orgId: string): Column<ProjectSummary>[] {
  return [
    {
      id: "name",
      header: "Project",
      cell: (p) => (
        <Link
          href={projectPaths(orgId, p.project_id).overview}
          className="font-medium underline-offset-4 hover:underline"
        >
          {p.name}
        </Link>
      ),
      sortValue: (p) => p.name,
    },
    {
      id: "events",
      header: "Events",
      cell: (p) => formatCount(p.events),
      sortValue: (p) => p.events,
      align: "right",
    },
    {
      id: "requests",
      header: "Requests",
      cell: (p) => formatCount(p.requests),
      sortValue: (p) => p.requests,
      align: "right",
    },
    {
      id: "errors",
      header: "Errors",
      cell: (p) => formatCount(p.errors),
      sortValue: (p) => p.errors,
      align: "right",
    },
    {
      id: "error_rate",
      header: "Error rate",
      cell: (p) =>
        p.error_rate === null ? <span title="No requests">—</span> : formatPercent(p.error_rate),
      sortValue: (p) => p.error_rate,
      align: "right",
    },
    {
      id: "p95",
      header: "p95",
      cell: (p) =>
        p.p95_ms === null ? (
          <span title={`${p.samples} samples (minimum 20)`}>—</span>
        ) : (
          formatMs(p.p95_ms)
        ),
      sortValue: (p) => p.p95_ms,
      align: "right",
    },
  ]
}

export function OrgDashboard({ orgId }: { orgId: string }) {
  const { range, setRange } = useRangeParam()
  const [nonce, setNonce] = useState(0)
  const { state, reload } = useApiQuery<Loaded>(
    async () => {
      const window = resolveRange(range)
      const [summary, series] = await Promise.all([
        getOrgSummary(orgId, window),
        getOrgTimeseries(orgId, window),
      ])
      return { summary: summary.data, series: series.data }
    },
    `${orgId}:${JSON.stringify(range)}:${nonce}`,
  )

  const header = (
    <PageHeader
      title="Dashboard"
      description={`All active projects · ${describeRange(range)}`}
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
          fallback="Could not load the dashboard."
          notFoundTitle="Organization not found"
        >
          <Link href="/orgs" className={buttonVariants({ variant: "outline" })}>
            Back to organizations
          </Link>
        </QueryError>
      </div>
    )
  }

  const { summary, series } = state.data
  if (summary.project_count === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          icon={FolderKanbanIcon}
          title="No projects yet"
          description="Create a project, add an ingestion key and send logs to see metrics here."
        >
          <Link href={orgPaths(orgId).projects} className={buttonVariants()}>
            Create a project
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}
      <TotalsCards totals={summary.totals} />
      {summary.totals.events === 0 ? (
        <EmptyState
          icon={FolderKanbanIcon}
          title="No logs in this range"
          description="None of the active projects received logs in the selected range."
        >
          <IngestGuidance />
        </EmptyState>
      ) : (
        <Card size="sm">
          <CardContent>
            <TimeseriesChart
              title="Requests and errors across projects"
              points={series.points}
              bucketSeconds={series.bucket_seconds}
              series={COUNT_SERIES}
            />
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <SortableTable
              caption="Metrics per project"
              columns={projectColumns(orgId)}
              rows={summary.projects}
              rowKey={(p) => p.project_id}
              initialSort={{ id: "events", direction: "descending" }}
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Recent errors</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentErrorsList
                items={summary.recent_errors}
                hrefFor={(e) => `${projectPaths(orgId, e.project_id ?? "").logs}?log=${e.id}`}
              />
            </CardContent>
          </Card>
          <IncidentsPlaceholder />
        </div>
      </div>
    </div>
  )
}

/** Reads `orgId` from the route; lets the (server) page stay free of client hooks. */
export function OrgDashboardFromParams() {
  const params = useParams<{ orgId: string }>()
  return <OrgDashboard orgId={params.orgId} />
}
