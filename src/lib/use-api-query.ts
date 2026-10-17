"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type QueryState<T> =
  { status: "loading" } | { status: "error"; error: unknown } | { status: "success"; data: T }

/**
 * Minimal client-side loader with loading/error/success states and a reload function.
 * `key` identifies the resource; the loader re-runs when it changes or on `reload()`.
 */
export function useApiQuery<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" })
  const [version, setVersion] = useState(0)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let active = true
    loadRef.current().then(
      (data) => {
        if (active) setState({ status: "success", data })
      },
      (error: unknown) => {
        if (active) setState({ status: "error", error })
      },
    )
    return () => {
      active = false
    }
  }, [key, version])

  const reload = useCallback(() => {
    setState({ status: "loading" })
    setVersion((v) => v + 1)
  }, [])

  return { state, reload, setState }
}
