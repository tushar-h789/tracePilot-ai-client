"use client"

import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface Option {
  value: string
  label: ReactNode
  count?: number
}

/** Disclosure button + checkbox list (keyboard: Tab/Space, Escape closes). */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  emptyText = "No values in this range.",
}: {
  label: string
  options: Option[]
  selected: readonly string[]
  onChange: (next: string[]) => void
  emptyText?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const summary =
    selected.length === 0
      ? "All"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`

  return (
    <div
      ref={ref}
      className="relative flex flex-col gap-1"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation()
          setOpen(false)
        }
      }}
    >
      <span id={`${id}-label`} className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 min-w-32 items-center justify-between gap-2 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span id={`${id}-value`} className="truncate">
          {summary}
        </span>
        <ChevronDownIcon aria-hidden="true" className="size-4 text-muted-foreground" />
      </button>
      {open ? (
        <div
          id={`${id}-panel`}
          className="absolute top-full z-30 mt-1 max-h-72 w-60 overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          <fieldset>
            <legend className="sr-only">{label}</legend>
            {options.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              options.map((opt) => {
                const checked = selected.includes(opt.value)
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring/50"
                  >
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border",
                        checked && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {checked ? <CheckIcon className="size-3" /> : null}
                    </span>
                    <span className="flex-1 truncate">{opt.label}</span>
                    {opt.count !== undefined ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {opt.count}
                      </span>
                    ) : null}
                  </label>
                )
              })
            )}
          </fieldset>
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-sm px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
            >
              Clear selection
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
