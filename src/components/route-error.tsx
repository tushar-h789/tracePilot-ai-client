"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

function digestOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    const { digest } = error as { digest?: unknown }
    return typeof digest === "string" ? digest : undefined
  }
  return undefined
}

/** Shared error boundary UI. Never renders error messages (they may contain internals). */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = digestOf(error)
  useEffect(() => {
    console.error("Route error", digest ?? "(no digest)")
  }, [digest])

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center"
    >
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        An unexpected error occurred.{digest ? ` Reference: ${digest}` : ""}
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  )
}
