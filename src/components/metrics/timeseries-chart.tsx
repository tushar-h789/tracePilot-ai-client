"use client"

import { useId } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { TimeseriesPoint } from "@/lib/api/types"
import { formatBucketLabel, formatCount, formatMs } from "@/lib/format"

export interface SeriesDef {
  key: "requests" | "errors" | "events" | "p95_ms"
  label: string
  color: string
  /** Distinct dash pattern + marker so color is never the only signal. */
  dash?: string
  unit?: "count" | "ms"
}

export const COUNT_SERIES: SeriesDef[] = [
  { key: "requests", label: "Requests", color: "var(--chart-1)" },
  { key: "errors", label: "Errors", color: "var(--chart-2)", dash: "6 3" },
]
export const LATENCY_SERIES: SeriesDef[] = [
  { key: "p95_ms", label: "p95 latency (ms)", color: "var(--chart-3)", unit: "ms" },
]

function formatValue(value: number | null | undefined, unit: SeriesDef["unit"]): string {
  if (value === null || value === undefined) return "—"
  return unit === "ms" ? formatMs(value) : formatCount(value)
}

/** Text summary used as the chart's accessible description. */
export function summarize(points: TimeseriesPoint[], series: SeriesDef[]): string {
  if (points.length === 0) return "No data points."
  return series
    .map((s) => {
      const values = points.map((p) => p[s.key]).filter((v): v is number => typeof v === "number")
      if (values.length === 0) return `${s.label}: no values.`
      if (s.unit === "ms") return `${s.label}: highest ${formatMs(Math.max(...values))}.`
      const total = values.reduce((a, b) => a + b, 0)
      return `${s.label}: ${formatCount(total)} in total, peak ${formatCount(Math.max(...values))} per bucket.`
    })
    .join(" ")
}

/**
 * Accessible line chart: titled figure, text summary as aria description, distinct dash
 * patterns, and a "Show data table" fallback with every value.
 */
export function TimeseriesChart({
  title,
  points,
  bucketSeconds,
  series,
  height = 220,
}: {
  title: string
  points: TimeseriesPoint[]
  bucketSeconds: number
  series: SeriesDef[]
  height?: number
}) {
  const id = useId()
  const titleId = `${id}-title`
  const descId = `${id}-desc`
  const data = points.map((p) => ({
    ...p,
    label: formatBucketLabel(p.bucket_start, bucketSeconds),
  }))
  const bucketLabel =
    bucketSeconds >= 3600 ? `${bucketSeconds / 3600} h` : `${Math.round(bucketSeconds / 60)} min`

  return (
    <figure className="space-y-2" aria-labelledby={titleId}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span id={titleId} className="text-sm font-medium">
          {title}
        </span>
        <span className="text-xs text-muted-foreground">{bucketLabel} buckets</span>
      </figcaption>
      <p id={descId} className="sr-only">
        {summarize(points, series)}
      </p>
      <div role="img" aria-labelledby={titleId} aria-describedby={descId} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value, name) => {
                const s = series.find((x) => x.label === name)
                return [formatValue(value as number | null, s?.unit), name]
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeDasharray={s.dash}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Show data table
        </summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-md border">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{title} values per bucket</caption>
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th scope="col" className="px-2 py-1 font-medium">
                  Bucket start
                </th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="px-2 py-1 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.bucket_start} className="border-t">
                  <th scope="row" className="px-2 py-1 font-normal whitespace-nowrap">
                    {new Date(p.bucket_start).toLocaleString()}
                  </th>
                  {series.map((s) => (
                    <td key={s.key} className="px-2 py-1 text-right tabular-nums">
                      {formatValue(p[s.key], s.unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
