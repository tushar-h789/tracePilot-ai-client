"use client"

import { SearchIcon } from "lucide-react"
import { useEffect, useId, useState } from "react"

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value"

import { MAX_Q } from "./log-filters"

export const SEARCH_DEBOUNCE_MS = 350

/** Free-text search; commits to the URL after the user stops typing. */
export function SearchBox({
  initial,
  onCommit,
}: {
  initial: string
  onCommit: (q: string) => void
}) {
  const id = useId()
  const [value, setValue] = useState(initial)
  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS)
  useEffect(() => {
    const next = debounced.trim()
    if (next !== initial) onCommit(next)
    // `initial` and `onCommit` change with every URL update; only typing should commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className="flex min-w-48 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        Search messages
      </label>
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-2 left-2 size-4 text-muted-foreground"
        />
        <input
          id={id}
          type="search"
          value={value}
          maxLength={MAX_Q}
          placeholder="e.g. timeout db"
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-full rounded-md border bg-background pr-2 pl-8 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  )
}

/** Exact-match text filter committed on Enter or blur (trace id, request id). */
export function ExactFilter({
  label,
  initial,
  onCommit,
  maxLength,
  placeholder,
}: {
  label: string
  initial: string
  onCommit: (value: string) => void
  maxLength: number
  placeholder?: string
}) {
  const id = useId()
  const [value, setValue] = useState(initial)
  const commit = () => {
    if (value.trim() !== initial) onCommit(value.trim())
  }
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
        }}
        className="h-8 w-48 rounded-md border bg-background px-2 font-mono text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  )
}
