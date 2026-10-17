import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LogsExplorer, PAGE_SIZE } from "@/components/logs/logs-explorer"
import { SEARCH_DEBOUNCE_MS } from "@/components/logs/search-box"
import { ApiError } from "@/lib/api/errors"

import { detail, log } from "./helpers/fixtures"
import { type createNavigation } from "./helpers/navigation"

const nav = vi.hoisted(() => ({ current: null as ReturnType<typeof createNavigation> | null }))
vi.mock("next/navigation", async () => {
  const { createNavigation: make } = await import("./helpers/navigation")
  nav.current = make("/orgs/o1/projects/p1/logs", { orgId: "o1", projectId: "p1" })
  return nav.current.module
})
const api = vi.hoisted(() => ({ listLogs: vi.fn(), getLog: vi.fn(), getLogFacets: vi.fn() }))
vi.mock("@/lib/api/logs", () => api)

const facets = {
  range_from: "",
  range_to: "",
  levels: [
    { value: "info", count: 90 },
    { value: "error", count: 10 },
  ],
  services: [
    { value: "api", count: 70 },
    { value: "worker", count: 30 },
  ],
  environments: [{ value: "production", count: 100 }],
}
const page = (ids: number[], next: string | null = null) => ({
  data: { items: ids.map((i) => log(i)), next_cursor: next, range_from: "", range_to: "" },
})
const lastQuery = () => api.listLogs.mock.calls.at(-1)?.[1]
const url = () => nav.current!.search

beforeEach(() => {
  vi.clearAllMocks()
  nav.current!.set("")
  api.getLogFacets.mockResolvedValue({ data: facets })
})
afterEach(() => vi.useRealTimers())

describe("LogsExplorer", () => {
  it("shows a skeleton, then rows (one bounded page, never everything)", async () => {
    let resolve: (v: unknown) => void = () => {}
    api.listLogs.mockReturnValueOnce(new Promise((r) => (resolve = r)))
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    expect(screen.getByLabelText("Loading logs")).toBeInTheDocument()
    resolve(page([1, 2, 3]))
    expect(await screen.findAllByTestId("log-row")).toHaveLength(3)
    expect(screen.getByText(/Showing 3 logs · end of results/)).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({
      limit: PAGE_SIZE,
      levels: [],
      services: [],
      cursor: undefined,
    })
    expect(lastQuery().from).toBeTruthy()
    expect(lastQuery().to).toBeTruthy()
  })

  it("empty project: guidance with SDK and CLI instructions", async () => {
    api.listLogs.mockResolvedValue(page([]))
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    expect(await screen.findByText("No logs in this range")).toBeInTheDocument()
    expect(screen.getByText(/tracepilot-demo --scenario/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Manage ingestion keys" })).toHaveAttribute(
      "href",
      "/orgs/o1/projects/p1/settings",
    )
  })

  it("no matches with filters: offers to clear them", async () => {
    nav.current!.set("level=critical&service=api&q=nothing")
    api.listLogs.mockResolvedValue(page([]))
    const user = userEvent.setup()
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    expect(await screen.findByText("No logs match these filters")).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({ levels: ["critical"], services: ["api"], q: "nothing" })
    await user.click(screen.getAllByRole("button", { name: "Clear filters" })[0]!)
    await waitFor(() => expect(url().toString()).toBe(""))
  })

  it("error state with retry", async () => {
    api.listLogs
      .mockRejectedValueOnce(new ApiError("http", "boom", { status: 500 }))
      .mockResolvedValue(page([7]))
    const user = userEvent.setup()
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    await user.click(await screen.findByRole("button", { name: "Try again" }))
    expect(await screen.findAllByTestId("log-row")).toHaveLength(1)
  })

  it("syncs the level and service multi-selects to the URL", async () => {
    api.listLogs.mockResolvedValue(page([1]))
    const user = userEvent.setup()
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    await screen.findAllByTestId("log-row")
    await user.click(screen.getByRole("button", { name: /Level/ }))
    await user.click(screen.getByRole("checkbox", { name: /error/ }))
    await waitFor(() => expect(url().getAll("level")).toEqual(["error"]))
    await waitFor(() => expect(lastQuery()).toMatchObject({ levels: ["error"] }))
    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("button", { name: /Service/ }))
    await user.click(screen.getByRole("checkbox", { name: /worker/ }))
    await waitFor(() => expect(url().getAll("service")).toEqual(["worker"]))
    expect(url().getAll("level")).toEqual(["error"])
    await waitFor(() =>
      expect(lastQuery()).toMatchObject({ levels: ["error"], services: ["worker"] }),
    )
  })

  it("debounces search before touching the URL", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.listLogs.mockResolvedValue(page([1]))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    await screen.findAllByTestId("log-row")
    const calls = api.listLogs.mock.calls.length
    await user.type(screen.getByLabelText("Search messages"), "timeout db")
    expect(url().get("q")).toBeNull()
    expect(api.listLogs.mock.calls.length).toBe(calls)
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 10)
    })
    await waitFor(() => expect(url().get("q")).toBe("timeout db"))
    await waitFor(() => expect(lastQuery()).toMatchObject({ q: "timeout db" }))
    expect(nav.current!.replace.mock.calls.filter(([u]) => String(u).includes("q=")).length).toBe(1)
  })

  it("commits the trace id on Enter", async () => {
    api.listLogs.mockResolvedValue(page([1]))
    const user = userEvent.setup()
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    await screen.findAllByTestId("log-row")
    await user.type(screen.getByLabelText("Trace id"), "abc123{Enter}")
    await waitFor(() => expect(url().get("trace")).toBe("abc123"))
    await waitFor(() => expect(lastQuery()).toMatchObject({ traceId: "abc123" }))
  })

  it("loads more with the cursor and the same time window, appending rows", async () => {
    api.listLogs
      .mockResolvedValueOnce(page([1, 2], "cur-1"))
      .mockResolvedValueOnce(page([3, 4], null))
    const user = userEvent.setup()
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    await screen.findAllByTestId("log-row")
    const first = api.listLogs.mock.calls[0]![1]
    await user.click(screen.getByRole("button", { name: `Load ${PAGE_SIZE} more` }))
    expect(await screen.findAllByTestId("log-row")).toHaveLength(4)
    const second = api.listLogs.mock.calls[1]![1]
    expect(second).toMatchObject({ cursor: "cur-1", from: first.from, to: first.to })
    expect(screen.queryByRole("button", { name: /Load .* more/ })).not.toBeInTheDocument()
    expect(screen.getByText(/end of results/)).toBeInTheDocument()
  })

  it("keeps rows when loading more fails", async () => {
    api.listLogs
      .mockResolvedValueOnce(page([1], "cur-1"))
      .mockRejectedValueOnce(new ApiError("network", "offline"))
    const user = userEvent.setup()
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    await screen.findAllByTestId("log-row")
    await user.click(screen.getByRole("button", { name: `Load ${PAGE_SIZE} more` }))
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.getAllByTestId("log-row")).toHaveLength(1)
  })

  it("opens the detail drawer from the URL and renders attributes as text", async () => {
    api.listLogs.mockResolvedValue(page([5]))
    api.getLog.mockResolvedValue({
      data: detail(5, {
        trace_id: "trace-5",
        message: "<img src=x onerror=alert(1)>",
        attributes: { html: "<script>alert(1)</script>", nested: { ok: true } },
      }),
    })
    const user = userEvent.setup()
    render(<LogsExplorer orgId="o1" projectId="p1" />)
    const rows = await screen.findAllByTestId("log-row")
    await user.click(within(rows[0]!).getByRole("button", { name: "message 5" }))
    await waitFor(() => expect(url().get("log")).toBe("5"))
    const dialog = await screen.findByRole("dialog")
    const attrs = await within(dialog).findByTestId("log-attributes")
    expect(attrs.textContent).toContain('"html": "<script>alert(1)</script>"')
    expect(dialog.querySelector("script")).toBeNull()
    expect(dialog.querySelector("img")).toBeNull()
    expect(api.getLog).toHaveBeenCalledWith("p1", 5)
    await user.click(within(dialog).getByRole("button", { name: "Show this trace" }))
    await waitFor(() => expect(url().get("trace")).toBe("trace-5"))
    expect(url().get("log")).toBeNull()
  })
})
