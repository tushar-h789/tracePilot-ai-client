import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrgDashboard } from "@/components/dashboard/org-dashboard"
import { ProjectOverview } from "@/components/dashboard/project-overview"
import { ApiError } from "@/lib/api/errors"

import { log, point, totals } from "./helpers/fixtures"
import { type createNavigation } from "./helpers/navigation"

const nav = vi.hoisted(() => ({ current: null as ReturnType<typeof createNavigation> | null }))
vi.mock("next/navigation", async () => {
  const { createNavigation: make } = await import("./helpers/navigation")
  nav.current = make("/orgs/o1/projects/p1", { orgId: "o1", projectId: "p1" })
  return nav.current.module
})
const api = vi.hoisted(() => ({
  getProjectOverview: vi.fn(),
  getProjectTimeseries: vi.fn(),
  getProjectServices: vi.fn(),
  getRecentErrors: vi.fn(),
  getOrgSummary: vi.fn(),
  getOrgTimeseries: vi.fn(),
}))
vi.mock("@/lib/api/metrics", () => api)

const series = {
  data: {
    range_from: "",
    range_to: "",
    bucket_seconds: 900,
    min_samples: 5,
    points: [point(0), point(1)],
  },
}

function project(t = totals()) {
  api.getProjectOverview.mockResolvedValue({
    data: { project_id: "p1", range_from: "", range_to: "", totals: t },
  })
  api.getProjectTimeseries.mockResolvedValue(series)
  api.getProjectServices.mockResolvedValue({
    data: {
      range_from: "",
      range_to: "",
      min_samples: 20,
      items: [
        {
          service_name: "api",
          events: 80,
          requests: 70,
          errors: 5,
          request_errors: 5,
          error_rate: 5 / 70,
          samples: 70,
          p95_ms: 150,
        },
        {
          service_name: "worker",
          events: 40,
          requests: 0,
          errors: 2,
          request_errors: 0,
          error_rate: null,
          samples: 0,
          p95_ms: null,
        },
      ],
    },
  })
  api.getRecentErrors.mockResolvedValue({
    data: {
      range_from: "",
      range_to: "",
      items: [log(9, { level: "error", message: "db timeout", http_status: 500 })],
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  nav.current!.set("")
})

describe("ProjectOverview", () => {
  it("renders stat cards, charts, services and recent errors", async () => {
    project()
    render(<ProjectOverview orgId="o1" projectId="p1" />)
    expect(screen.getByLabelText("Loading metrics")).toBeInTheDocument()
    expect(await screen.findByText("5.00%")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Requests and errors" })).toBeInTheDocument()
    const table = screen.getByRole("table", { name: "Per-service metrics" })
    expect(within(table).getByText("worker")).toBeInTheDocument()
    expect(within(table).getAllByText("—").length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole("link", { name: /db timeout/ })).toHaveAttribute(
      "href",
      "/orgs/o1/projects/p1/logs?log=9",
    )
    expect(screen.getAllByText("Incidents arrive in Phase 5.").length).toBeGreaterThan(0)
    const window = api.getProjectOverview.mock.calls[0]![1]
    expect(new Date(window.to).getTime() - new Date(window.from).getTime()).toBe(24 * 3600 * 1000)
  })

  it("range picker updates the URL and reloads", async () => {
    project()
    const user = userEvent.setup()
    render(<ProjectOverview orgId="o1" projectId="p1" />)
    await screen.findByText("5.00%")
    await user.selectOptions(screen.getByLabelText("Time range"), "7d")
    expect(nav.current!.search.get("range")).toBe("7d")
    await screen.findByText("5.00%")
    const window = api.getProjectOverview.mock.calls.at(-1)![1]
    expect(new Date(window.to).getTime() - new Date(window.from).getTime()).toBe(
      7 * 24 * 3600 * 1000,
    )
  })

  it("validates a custom range before applying it", async () => {
    project()
    const user = userEvent.setup()
    render(<ProjectOverview orgId="o1" projectId="p1" />)
    await screen.findByText("5.00%")
    await user.selectOptions(screen.getByLabelText("Time range"), "custom")
    const from = screen.getByLabelText("From")
    const to = screen.getByLabelText("To")
    await user.clear(from)
    await user.type(from, "2026-10-17T10:00")
    await user.clear(to)
    await user.type(to, "2026-10-17T09:00")
    await user.click(screen.getByRole("button", { name: "Apply" }))
    expect(screen.getByRole("alert")).toHaveTextContent("The start must be before the end.")
    expect(nav.current!.search.get("range")).toBeNull()
    await user.clear(to)
    await user.type(to, "2026-10-17T12:00")
    await user.click(screen.getByRole("button", { name: "Apply" }))
    expect(nav.current!.search.get("range")).toBe("custom")
    expect(nav.current!.search.get("from")).toBeTruthy()
  })

  it("null metrics show — with explanations", async () => {
    project(
      totals({
        requests: 0,
        request_errors: 0,
        error_rate: null,
        error_rate_reason: "no_requests",
        latency: {
          p50_ms: null,
          p95_ms: null,
          p99_ms: null,
          samples: 0,
          min_samples: 20,
          reason: "no_latency_samples",
        },
      }),
    )
    render(<ProjectOverview orgId="o1" projectId="p1" />)
    expect(await screen.findByLabelText("Error rate: not available")).toBeInTheDocument()
    expect(screen.getByText("No requests with a duration in this range.")).toBeInTheDocument()
  })

  it("no events: empty state with ingestion guidance", async () => {
    project(
      totals({
        events: 0,
        requests: 0,
        errors: 0,
        request_errors: 0,
        error_rate: null,
        error_rate_reason: "no_requests",
      }),
    )
    render(<ProjectOverview orgId="o1" projectId="p1" />)
    expect(await screen.findByText("No logs in this range")).toBeInTheDocument()
    expect(screen.getByText(/TRACEPILOT_INGEST_KEY/)).toBeInTheDocument()
  })

  it("error with retry, and not-found", async () => {
    project()
    api.getProjectOverview.mockRejectedValueOnce(new ApiError("http", "x", { status: 503 }))
    const user = userEvent.setup()
    const { unmount } = render(<ProjectOverview orgId="o1" projectId="p1" />)
    await user.click(await screen.findByRole("button", { name: "Try again" }))
    expect(await screen.findByText("5.00%")).toBeInTheDocument()
    unmount()
    api.getProjectOverview.mockRejectedValueOnce(new ApiError("http", "x", { status: 404 }))
    render(<ProjectOverview orgId="o1" projectId="p1" />)
    expect(await screen.findByText("Project not found")).toBeInTheDocument()
  })
})

describe("OrgDashboard", () => {
  const summary = (over = {}) => ({
    data: {
      org_id: "o1",
      range_from: "",
      range_to: "",
      project_count: 2,
      totals: totals(),
      min_samples: 20,
      projects: [
        {
          project_id: "p1",
          name: "Checkout",
          slug: "checkout",
          environment: "production",
          events: 100,
          requests: 90,
          errors: 6,
          request_errors: 5,
          error_rate: 5 / 90,
          samples: 90,
          p95_ms: 200,
        },
        {
          project_id: "p2",
          name: "Search",
          slug: "search",
          environment: "production",
          events: 20,
          requests: 0,
          errors: 1,
          request_errors: 0,
          error_rate: null,
          samples: 0,
          p95_ms: null,
        },
      ],
      recent_errors: [
        {
          ...log(3, { level: "critical", message: "boom" }),
          project_id: "p2",
          project_name: "Search",
        },
      ],
      ...over,
    },
  })

  it("renders totals, a projects table and cross-project errors", async () => {
    api.getOrgSummary.mockResolvedValue(summary())
    api.getOrgTimeseries.mockResolvedValue(series)
    render(<OrgDashboard orgId="o1" />)
    const table = await screen.findByRole("table", { name: "Metrics per project" })
    expect(within(table).getByRole("link", { name: "Checkout" })).toHaveAttribute(
      "href",
      "/orgs/o1/projects/p1",
    )
    expect(screen.getByRole("link", { name: /boom/ })).toHaveAttribute(
      "href",
      "/orgs/o1/projects/p2/logs?log=3",
    )
    expect(
      screen.getByRole("img", { name: "Requests and errors across projects" }),
    ).toBeInTheDocument()
  })

  it("no projects: call to action", async () => {
    api.getOrgSummary.mockResolvedValue(
      summary({ project_count: 0, projects: [], recent_errors: [] }),
    )
    api.getOrgTimeseries.mockResolvedValue(series)
    render(<OrgDashboard orgId="o1" />)
    expect(await screen.findByRole("link", { name: "Create a project" })).toHaveAttribute(
      "href",
      "/orgs/o1/projects",
    )
  })
})
