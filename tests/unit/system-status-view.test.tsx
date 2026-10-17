import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  SystemStatusSkeleton,
  SystemStatusView,
} from "@/components/system-status/system-status-view"

describe("SystemStatusView", () => {
  it("shows all checks ready", () => {
    render(
      <SystemStatusView
        status={{
          state: "ok",
          readiness: {
            status: "ok",
            checks: {
              database: { status: "ok", latency_ms: 3.21 },
              redis: { status: "ok", latency_ms: 0.5 },
            },
          },
        }}
      />,
    )
    expect(screen.getByText("All systems ready")).toBeInTheDocument()
    expect(screen.getByText("Database (PostgreSQL)")).toBeInTheDocument()
    expect(screen.getByText("3.2 ms")).toBeInTheDocument()
    expect(screen.getAllByText("OK")).toHaveLength(2)
  })

  it("shows a degraded state with the failing dependency", () => {
    render(
      <SystemStatusView
        status={{
          state: "degraded",
          readiness: {
            status: "unavailable",
            checks: {
              database: { status: "ok", latency_ms: 1 },
              redis: { status: "error", latency_ms: 2 },
            },
          },
        }}
      />,
    )
    expect(screen.getByText("Degraded")).toBeInTheDocument()
    expect(screen.getByText("Error")).toBeInTheDocument()
  })

  it("shows an unreachable state with a safe reason", () => {
    render(
      <SystemStatusView
        status={{ state: "unreachable", reason: "The API could not be reached." }}
      />,
    )
    expect(screen.getByText("API unreachable")).toBeInTheDocument()
    expect(screen.getByText("The API could not be reached.")).toBeInTheDocument()
  })

  it("renders an accessible loading skeleton", () => {
    render(<SystemStatusSkeleton />)
    expect(screen.getByLabelText("System status loading")).toHaveAttribute("aria-busy", "true")
  })
})
