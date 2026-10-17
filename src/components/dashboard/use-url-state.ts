"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import { parseRange, rangeToParams, type RangeSelection } from "@/lib/time-range"

/** Read/replace URL search params without adding history entries. */
export function useUrlParams() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const update = useCallback(
    (changes: Record<string, string | readonly string[] | undefined | null>) => {
      const next = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(changes)) {
        next.delete(key)
        if (Array.isArray(value)) value.forEach((v) => next.append(key, v))
        else if (typeof value === "string" && value !== "") next.set(key, value)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )
  return { params, update }
}

export function useRangeParam() {
  const { params, update } = useUrlParams()
  const key = params.toString()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every param change
  const range = useMemo(() => parseRange(params), [key])
  const setRange = useCallback((sel: RangeSelection) => update(rangeToParams(sel)), [update])
  return { range, setRange }
}
