import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RouteError } from "@/components/route-error"

describe("RouteError", () => {
  it("shows a generic message with the digest and never the raw error message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const retry = vi.fn()
    const error = Object.assign(new Error("db password=hunter2"), { digest: "abc123" })
    render(<RouteError error={error} retry={retry} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong")
    expect(screen.getByText(/Reference: abc123/)).toBeInTheDocument()
    expect(screen.queryByText(/hunter2/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it("works without a digest", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    render(<RouteError error="boom" retry={() => {}} />)
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument()
  })
})
