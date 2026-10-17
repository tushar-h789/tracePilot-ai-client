"use client"

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  /** Value used for sorting; null/undefined always sorts last. Omit to make it unsortable. */
  sortValue?: (row: T) => number | string | null | undefined
  align?: "left" | "right"
}

type Direction = "ascending" | "descending"

export function sortRows<T>(
  rows: readonly T[],
  column: Column<T> | undefined,
  direction: Direction,
): T[] {
  if (!column?.sortValue) return [...rows]
  const get = column.sortValue
  return [...rows].sort((a, b) => {
    const x = get(a)
    const y = get(b)
    if (x === y) return 0
    if (x === null || x === undefined) return 1
    if (y === null || y === undefined) return -1
    const cmp =
      typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))
    return direction === "ascending" ? cmp : -cmp
  })
}

/** Accessible table: header buttons toggle sorting, `aria-sort` reflects the state. */
export function SortableTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  initialSort,
  empty,
}: {
  caption: string
  columns: Column<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  initialSort?: { id: string; direction: Direction }
  empty?: ReactNode
}) {
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = sort
    ? sortRows(
        rows,
        columns.find((c) => c.id === sort.id),
        sort.direction,
      )
    : [...rows]

  function toggle(id: string) {
    setSort((prev) =>
      prev?.id === id
        ? { id, direction: prev.direction === "ascending" ? "descending" : "ascending" }
        : { id, direction: "descending" },
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-muted/50 text-left">
          <tr>
            {columns.map((col) => {
              const active = sort?.id === col.id
              const Icon = !active
                ? ArrowUpDownIcon
                : sort.direction === "ascending"
                  ? ArrowUpIcon
                  : ArrowDownIcon
              return (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={active ? sort.direction : col.sortValue ? "none" : undefined}
                  className={cn(
                    "px-3 py-2 font-medium whitespace-nowrap",
                    col.align === "right" && "text-right",
                  )}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(col.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                        col.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {col.header}
                      <Icon
                        aria-hidden="true"
                        className={cn("size-3.5", !active && "opacity-40")}
                      />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                {empty ?? "No rows."}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={rowKey(row)} className="border-t">
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn("px-3 py-2", col.align === "right" && "text-right tabular-nums")}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
