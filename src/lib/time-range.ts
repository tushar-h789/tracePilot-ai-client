/**
 * Time ranges for dashboards and the logs explorer. URL params: `range=<preset>` or
 * `range=custom&from=<iso>&to=<iso>`. The API enforces [from, to), max 30 days (docs/METRICS.md).
 */
export const RANGE_PRESETS = [
  { id: "15m", label: "Last 15 minutes", ms: 15 * 60_000 },
  { id: "1h", label: "Last hour", ms: 60 * 60_000 },
  { id: "6h", label: "Last 6 hours", ms: 6 * 60 * 60_000 },
  { id: "24h", label: "Last 24 hours", ms: 24 * 60 * 60_000 },
  { id: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60_000 },
  { id: "30d", label: "Last 30 days", ms: 30 * 24 * 60 * 60_000 },
] as const

export type RangePreset = (typeof RANGE_PRESETS)[number]["id"]
export const DEFAULT_RANGE: RangePreset = "24h"
export const MAX_RANGE_MS = 30 * 24 * 60 * 60_000

export type RangeSelection =
  { kind: "preset"; preset: RangePreset } | { kind: "custom"; from: string; to: string }

export function isPreset(value: string | null | undefined): value is RangePreset {
  return RANGE_PRESETS.some((p) => p.id === value)
}

export function presetLabel(preset: RangePreset): string {
  return RANGE_PRESETS.find((p) => p.id === preset)?.label ?? preset
}

/** Parse URL params into a selection; anything invalid falls back to the default preset. */
export function parseRange(params: URLSearchParams): RangeSelection {
  const range = params.get("range")
  if (range === "custom") {
    const from = params.get("from")
    const to = params.get("to")
    const check = validateCustomRange(from ?? "", to ?? "")
    if (from && to && check === null) return { kind: "custom", from, to }
  }
  return { kind: "preset", preset: isPreset(range) ? range : DEFAULT_RANGE }
}

/** Concrete ISO bounds for a selection (presets are relative to `now`). */
export function resolveRange(sel: RangeSelection, now: Date = new Date()) {
  if (sel.kind === "custom")
    return { from: new Date(sel.from).toISOString(), to: new Date(sel.to).toISOString() }
  const ms = RANGE_PRESETS.find((p) => p.id === sel.preset)?.ms ?? RANGE_PRESETS[3].ms
  return { from: new Date(now.getTime() - ms).toISOString(), to: now.toISOString() }
}

/** Returns an error message, or null when the custom range is acceptable. */
export function validateCustomRange(from: string, to: string): string | null {
  const a = Date.parse(from)
  const b = Date.parse(to)
  if (Number.isNaN(a) || Number.isNaN(b)) return "Enter both a start and an end."
  if (a >= b) return "The start must be before the end."
  if (b - a > MAX_RANGE_MS) return "The range can span at most 30 days."
  return null
}

export function rangeToParams(sel: RangeSelection): Record<string, string | undefined> {
  return sel.kind === "custom"
    ? { range: "custom", from: sel.from, to: sel.to }
    : {
        range: sel.preset === DEFAULT_RANGE ? undefined : sel.preset,
        from: undefined,
        to: undefined,
      }
}

export function describeRange(sel: RangeSelection): string {
  if (sel.kind === "preset") return presetLabel(sel.preset)
  return `${formatDateTime(sel.from)} – ${formatDateTime(sel.to)}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/** `datetime-local` input value (local time, no zone) <-> ISO string. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString()
}
