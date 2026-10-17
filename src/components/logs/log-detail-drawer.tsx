"use client"

import { CopyIcon, FilterIcon } from "lucide-react"
import { useState } from "react"

import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { getLog } from "@/lib/api/logs"
import type { LogEventDetail } from "@/lib/api/types"
import { formatMs, formatTimestamp } from "@/lib/format"
import { useApiQuery } from "@/lib/use-api-query"

import { HttpStatus, LevelBadge } from "./level-badge"

/** Attributes rendered as escaped text (React text node); never as HTML. */
export function AttributesJson({ value }: { value: unknown }) {
  const text = JSON.stringify(value ?? {}, null, 2)
  return (
    <pre
      data-testid="log-attributes"
      className="max-h-80 overflow-auto rounded-md bg-muted p-3 font-mono text-xs break-all whitespace-pre-wrap"
    >
      {text}
    </pre>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all">
        {children ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </>
  )
}

function DetailBody({
  projectId,
  logId,
  onFilterTrace,
}: {
  projectId: string
  logId: number
  onFilterTrace: (traceId: string) => void
}) {
  const { state, reload } = useApiQuery<LogEventDetail>(
    async () => (await getLog(projectId, logId)).data,
    `${projectId}:${logId}`,
  )
  const [copied, setCopied] = useState(false)

  if (state.status === "loading") {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading log event">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (state.status === "error") {
    return (
      <div className="p-4">
        <QueryError
          error={state.error}
          onRetry={reload}
          fallback="Could not load the log event."
          notFoundTitle="Log event not found"
        />
      </div>
    )
  }
  const log = state.data
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-4 overflow-y-auto px-4 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <LevelBadge level={log.level} />
        <HttpStatus status={log.http_status} />
        {log.is_synthetic ? (
          <span className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
            synthetic
          </span>
        ) : null}
      </div>
      <p className="text-sm break-words whitespace-pre-wrap" data-testid="log-message">
        {log.message}
      </p>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <Field label="Timestamp">
          <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
        </Field>
        <Field label="Received">
          <time dateTime={log.received_at}>{formatTimestamp(log.received_at)}</time>
        </Field>
        <Field label="Service">{log.service_name}</Field>
        <Field label="Environment">{log.environment}</Field>
        <Field label="HTTP">
          {log.http_method ? `${log.http_method} ${log.http_path ?? ""}` : null}
        </Field>
        <Field label="Duration">
          {log.duration_ms === null || log.duration_ms === undefined
            ? null
            : formatMs(log.duration_ms)}
        </Field>
        <Field label="Trace id">
          {log.trace_id ? <code className="font-mono text-xs">{log.trace_id}</code> : null}
        </Field>
        <Field label="Request id">
          {log.request_id ? <code className="font-mono text-xs">{log.request_id}</code> : null}
        </Field>
        <Field label="Event id">
          <code className="font-mono text-xs">{log.event_id}</code>
        </Field>
      </dl>
      <div className="flex flex-wrap gap-2">
        {log.trace_id ? (
          <Button size="sm" variant="outline" onClick={() => onFilterTrace(log.trace_id ?? "")}>
            <FilterIcon aria-hidden="true" />
            Show this trace
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={copy}>
          <CopyIcon aria-hidden="true" />
          {copied ? "Copied" : "Copy JSON"}
        </Button>
      </div>
      <section aria-labelledby="attributes-heading" className="space-y-2">
        <h3 id="attributes-heading" className="text-sm font-medium">
          Attributes
        </h3>
        <AttributesJson value={log.attributes} />
      </section>
    </div>
  )
}

export function LogDetailDrawer({
  projectId,
  logId,
  onClose,
  onFilterTrace,
}: {
  projectId: string
  logId: number | null
  onClose: () => void
  onFilterTrace: (traceId: string) => void
}) {
  return (
    <Sheet open={logId !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="right" className="w-full sm:max-w-xl data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Log event</SheetTitle>
          <SheetDescription>{logId !== null ? `#${logId}` : ""}</SheetDescription>
        </SheetHeader>
        {logId !== null ? (
          <DetailBody projectId={projectId} logId={logId} onFilterTrace={onFilterTrace} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
