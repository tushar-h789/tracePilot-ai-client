"use client"

import { CalendarRangeIcon } from "lucide-react"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DEFAULT_RANGE,
  fromLocalInput,
  RANGE_PRESETS,
  toLocalInput,
  validateCustomRange,
  type RangeSelection,
} from "@/lib/time-range"

/** Time presets plus a validated custom range (max 30 days, start before end). */
export function RangePicker({
  value,
  onChange,
}: {
  value: RangeSelection
  onChange: (next: RangeSelection) => void
}) {
  const id = useId()
  const [customOpen, setCustomOpen] = useState(value.kind === "custom")
  const now = new Date()
  const [from, setFrom] = useState(
    value.kind === "custom"
      ? toLocalInput(value.from)
      : toLocalInput(new Date(now.getTime() - 3_600_000).toISOString()),
  )
  const [to, setTo] = useState(
    value.kind === "custom" ? toLocalInput(value.to) : toLocalInput(now.toISOString()),
  )
  const [error, setError] = useState<string | null>(null)

  function onSelect(v: string) {
    if (v === "custom") {
      setCustomOpen(true)
      return
    }
    setCustomOpen(false)
    setError(null)
    onChange({ kind: "preset", preset: RANGE_PRESETS.find((p) => p.id === v)?.id ?? DEFAULT_RANGE })
  }

  function apply() {
    const fromIso = fromLocalInput(from)
    const toIso = fromLocalInput(to)
    const message = validateCustomRange(fromIso, toIso)
    setError(message)
    if (!message) onChange({ kind: "custom", from: fromIso, to: toIso })
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-preset`} className="text-xs font-medium text-muted-foreground">
          Time range
        </label>
        <div className="flex items-center gap-1">
          <CalendarRangeIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          <select
            id={`${id}-preset`}
            value={customOpen ? "custom" : value.kind === "preset" ? value.preset : "custom"}
            onChange={(e) => onSelect(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {RANGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom range…</option>
          </select>
        </div>
      </div>
      {customOpen ? (
        <fieldset className="flex flex-wrap items-end gap-2">
          <legend className="sr-only">Custom time range (your local time)</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-from`} className="text-xs font-medium text-muted-foreground">
              From
            </label>
            <input
              id={`${id}-from`}
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-to`} className="text-xs font-medium text-muted-foreground">
              To
            </label>
            <input
              id={`${id}-to`}
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" onClick={apply}>
            Apply
          </Button>
          {error ? (
            <p role="alert" className="basis-full text-xs text-danger">
              {error}
            </p>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  )
}
