"use client"

import { FilterXIcon, RefreshCwIcon, ScrollTextIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { IngestGuidance } from "@/components/dashboard/ingest-guidance"
import { RangePicker } from "@/components/dashboard/range-picker"
import { useUrlParams } from "@/components/dashboard/use-url-state"
import { EmptyState } from "@/components/empty-state"
import { FormAlert } from "@/components/form-alert"
import { projectPaths } from "@/components/layout/nav-items"
import { PageHeader } from "@/components/layout/page-header"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkspace } from "@/components/workspace/workspace-context"
import { errorMessage } from "@/lib/api/errors"
import { getLogFacets, listLogs, type LogQueryParams, type TimeWindow } from "@/lib/api/logs"
import type { LogEventSummary, LogFacetsResponse } from "@/lib/api/types"
import { formatCount, formatMs, formatTimestamp } from "@/lib/format"
import { describeRange, rangeToParams, resolveRange } from "@/lib/time-range"
import { useApiQuery } from "@/lib/use-api-query"

import { HttpStatus, LevelBadge, LEVELS } from "./level-badge"
import { LogDetailDrawer } from "./log-detail-drawer"
import {
  CLEARED_FILTERS,
  hasActiveFilters,
  parseLogFilters,
  type LogFilterState,
} from "./log-filters"
import { MultiSelect } from "./multi-select"
import { ExactFilter, SearchBox } from "./search-box"

export const PAGE_SIZE = 50

interface Page {
  window: TimeWindow
  items: LogEventSummary[]
  nextCursor: string | null
}

function toQuery(f: LogFilterState, window: TimeWindow, cursor?: string | null): LogQueryParams {
  return {
    ...window,
    levels: f.levels,
    services: f.services,
    environment: f.environment || undefined,
    traceId: f.traceId || undefined,
    requestId: f.requestId || undefined,
    q: f.q || undefined,
    cursor,
    limit: PAGE_SIZE,
  }
}

export function LogsExplorer({ orgId, projectId }: { orgId: string; projectId: string }) {
  const { params, update } = useUrlParams()
  const { project } = useWorkspace()
  const urlKey = params.toString()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- urlKey captures every param change
  const filters = useMemo(() => parseLogFilters(params), [urlKey])
  const logParam = params.get("log")
  const logId = logParam && /^\d{1,18}$/.test(logParam) ? Number(logParam) : null
  const [nonce, setNonce] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [more, setMore] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  })
  const filterKey = JSON.stringify(filters)

  const { state, reload, setState } = useApiQuery<Page>(async () => {
    const window = resolveRange(filters.range)
    const { data } = await listLogs(projectId, toQuery(filters, window))
    return { window, items: data.items, nextCursor: data.next_cursor }
  }, `${projectId}:${filterKey}:${nonce}`)

  const facets = useApiQuery<LogFacetsResponse>(
    async () => (await getLogFacets(projectId, resolveRange(filters.range))).data,
    `${projectId}:${JSON.stringify(filters.range)}:${nonce}`,
  )

  const set = (changes: Record<string, string | readonly string[] | undefined>) =>
    update({ ...changes, log: undefined })

  function clearFilters() {
    setResetKey((k) => k + 1)
    set(CLEARED_FILTERS)
  }

  async function loadMore() {
    if (state.status !== "success" || !state.data.nextCursor) return
    const page = state.data
    setMore({ busy: true, error: null })
    try {
      const { data } = await listLogs(projectId, toQuery(filters, page.window, page.nextCursor))
      setState({
        status: "success",
        data: { ...page, items: [...page.items, ...data.items], nextCursor: data.next_cursor },
      })
      setMore({ busy: false, error: null })
    } catch (error) {
      setMore({ busy: false, error: errorMessage(error, "Could not load more logs.") })
    }
  }

  const facetData = facets.state.status === "success" ? facets.state.data : null
  const levelOptions = LEVELS.map((l) => ({
    value: l,
    label: <LevelBadge level={l} />,
    count: facetData?.levels.find((f) => f.value === l)?.count ?? 0,
  }))
  const serviceValues = new Set([
    ...(facetData?.services.map((f) => f.value) ?? []),
    ...filters.services,
  ])
  const serviceOptions = [...serviceValues].map((s) => ({
    value: s,
    label: s,
    count: facetData?.services.find((f) => f.value === s)?.count,
  }))
  const envOptions = facetData?.environments ?? []
  const active = hasActiveFilters(filters)

  return (
    <div className="space-y-4">
      <PageHeader
        title={project ? `${project.name} · Logs` : "Logs"}
        description={`Newest first · ${describeRange(filters.range)}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNonce((n) => n + 1)}
            aria-label="Refresh logs"
          >
            <RefreshCwIcon aria-hidden="true" />
          </Button>
        }
      />

      <section
        aria-label="Log filters"
        className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
      >
        <RangePicker value={filters.range} onChange={(sel) => set(rangeToParams(sel))} />
        <MultiSelect
          label="Level"
          options={levelOptions}
          selected={filters.levels}
          onChange={(v) => set({ level: v })}
        />
        <MultiSelect
          label="Service"
          options={serviceOptions}
          selected={filters.services}
          onChange={(v) => set({ service: v })}
        />
        {envOptions.length > 1 || filters.environment ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="log-env" className="text-xs font-medium text-muted-foreground">
              Environment
            </label>
            <select
              id="log-env"
              value={filters.environment}
              onChange={(e) => set({ env: e.target.value || undefined })}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All</option>
              {envOptions.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.value} ({e.count})
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <ExactFilter
          key={`trace-${resetKey}-${filters.traceId}`}
          label="Trace id"
          initial={filters.traceId}
          maxLength={64}
          placeholder="exact match"
          onCommit={(v) => set({ trace: v || undefined })}
        />
        <SearchBox
          key={`q-${resetKey}`}
          initial={filters.q}
          onCommit={(q) => set({ q: q || undefined })}
        />
        {active ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <FilterXIcon aria-hidden="true" />
            Clear filters
          </Button>
        ) : null}
      </section>

      {state.status === "loading" ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading logs">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : state.status === "error" ? (
        <QueryError
          error={state.error}
          onRetry={reload}
          fallback="Could not load logs."
          notFoundTitle="Project not found"
        />
      ) : state.data.items.length === 0 ? (
        active ? (
          <EmptyState
            icon={FilterXIcon}
            title="No logs match these filters"
            description="Try a longer time range, fewer filters or different search words."
          >
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </EmptyState>
        ) : (
          <EmptyState
            icon={ScrollTextIcon}
            title="No logs in this range"
            description="This project has not received logs in the selected time range."
          >
            <IngestGuidance settingsHref={projectPaths(orgId, projectId).settings} />
          </EmptyState>
        )
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Showing {formatCount(state.data.items.length)} log
            {state.data.items.length === 1 ? "" : "s"}
            {state.data.nextCursor ? " · more available" : " · end of results"}
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Log events, newest first. Select a message to open its details.
              </caption>
              <thead className="bg-muted/50 text-left text-xs">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                    Time
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Level
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Service
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Message
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((log) => (
                  <tr
                    key={log.id}
                    data-testid="log-row"
                    aria-selected={logId === log.id}
                    className="border-t align-top hover:bg-muted/40 aria-selected:bg-muted"
                  >
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-muted-foreground">
                      <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                    </td>
                    <td className="px-3 py-2">
                      <LevelBadge level={log.level} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{log.service_name}</td>
                    <td className="max-w-xl px-3 py-2">
                      <button
                        type="button"
                        onClick={() => update({ log: String(log.id) })}
                        className="line-clamp-2 text-left break-words outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {log.message}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <HttpStatus status={log.http_status} />
                    </td>
                    <td className="px-3 py-2 text-right text-xs whitespace-nowrap tabular-nums">
                      {log.duration_ms === null || log.duration_ms === undefined
                        ? "—"
                        : formatMs(log.duration_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FormAlert message={more.error} />
          {state.data.nextCursor ? (
            <Button variant="outline" onClick={loadMore} disabled={more.busy}>
              {more.busy ? "Loading…" : `Load ${PAGE_SIZE} more`}
            </Button>
          ) : null}
        </div>
      )}

      <LogDetailDrawer
        projectId={projectId}
        logId={logId}
        onClose={() => update({ log: undefined })}
        onFilterTrace={(trace) => set({ trace })}
      />
    </div>
  )
}
