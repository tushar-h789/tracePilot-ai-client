import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/layout/app-shell"
import { buildNav, isActive, labelForPath } from "@/components/layout/nav-items"

import { type createNavigation } from "./helpers/navigation"

const nav = vi.hoisted(() => ({ current: null as ReturnType<typeof createNavigation> | null }))
vi.mock("next/navigation", async () => {
  const { createNavigation: make } = await import("./helpers/navigation")
  nav.current = make("/orgs/o1/projects/p1/logs", { orgId: "o1", projectId: "p1" })
  return nav.current.module
})
const orgs = vi.hoisted(() => ({ getOrganization: vi.fn() }))
const projects = vi.hoisted(() => ({ listProjects: vi.fn() }))
vi.mock("@/lib/api/organizations", () => orgs)
vi.mock("@/lib/api/projects", () => projects)

const project = (id: string, name: string) => ({
  id,
  org_id: "o1",
  name,
  slug: name.toLowerCase(),
  environment: "production",
  retention_days: 7,
  archived_at: null,
  created_at: "",
  updated_at: "",
  role: "owner" as const,
})

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  orgs.getOrganization.mockResolvedValue({
    data: { id: "o1", name: "Acme", slug: "acme", role: "owner", created_at: "" },
  })
  projects.listProjects.mockResolvedValue({
    data: { items: [project("p1", "Checkout"), project("p2", "Search")], next_cursor: null },
  })
})

describe("AppShell", () => {
  it("renders context navigation, breadcrumbs, switcher and content", async () => {
    render(
      <AppShell>
        <p>page content</p>
      </AppShell>,
    )
    const navs = screen.getAllByRole("navigation", { name: "Main" })
    const sidebar = navs[0]!
    expect(within(sidebar).getByRole("link", { name: "Logs" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(within(sidebar).getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    )
    expect(within(sidebar).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/orgs/o1",
    )
    expect(within(sidebar).getByRole("link", { name: "Project settings" })).toHaveAttribute(
      "href",
      "/orgs/o1/projects/p1/settings",
    )
    expect(screen.getByText("page content")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main")
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument()

    const crumbs = screen.getByRole("navigation", { name: "breadcrumb" })
    expect(await within(crumbs).findByRole("link", { name: "Acme" })).toHaveAttribute(
      "href",
      "/orgs/o1",
    )
    expect(within(crumbs).getByRole("link", { name: "Checkout" })).toHaveAttribute(
      "href",
      "/orgs/o1/projects/p1",
    )
    expect(within(crumbs).getByText("Logs")).toHaveAttribute("aria-current", "page")
    expect(window.localStorage.getItem("tp:last-project")).toContain("p1")
  })

  it("switches project, keeping the current section", async () => {
    const user = userEvent.setup()
    render(<AppShell>x</AppShell>)
    const select = await screen.findByLabelText("Project")
    await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(3))
    await user.selectOptions(select, "p2")
    expect(nav.current!.push).toHaveBeenCalledWith("/orgs/o1/projects/p2/logs")
  })

  it("collapses the sidebar to an icon rail and remembers it", async () => {
    const user = userEvent.setup()
    render(<AppShell>x</AppShell>)
    const button = screen.getByRole("button", { name: "Collapse sidebar" })
    expect(button).toHaveAttribute("aria-expanded", "true")
    await user.click(button)
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(document.getElementById("app-sidebar")).toHaveAttribute("data-collapsed", "true")
    expect(window.localStorage.getItem("tp:sidebar-collapsed")).toBe("1")
    // Labels stay available to assistive tech.
    expect(
      within(screen.getAllByRole("navigation", { name: "Main" })[0]!).getByRole("link", {
        name: "Logs",
      }),
    ).toBeInTheDocument()
  })

  it("mobile drawer opens with the same navigation", async () => {
    const user = userEvent.setup()
    render(<AppShell>x</AppShell>)
    await user.click(screen.getByRole("button", { name: "Open navigation" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("link", { name: "Logs" })).toHaveAttribute(
      "href",
      "/orgs/o1/projects/p1/logs",
    )
  })
})

describe("nav helpers", () => {
  it("builds sections per context", () => {
    expect(buildNav(null, null).map((s) => s.id)).toEqual(["workspace"])
    expect(buildNav("o1", null).map((s) => s.id)).toEqual(["workspace", "org"])
    expect(buildNav("o1", "p1").map((s) => s.id)).toEqual(["workspace", "org", "project"])
  })

  it("exact items only match their own path", () => {
    const dashboard = buildNav("o1", null)[1]!.items[0]!
    expect(isActive(dashboard, "/orgs/o1")).toBe(true)
    expect(isActive(dashboard, "/orgs/o1/projects")).toBe(false)
  })

  it("maps paths to labels for breadcrumbs", () => {
    expect(labelForPath("/orgs/o1/projects/p1/logs")).toBe("Logs")
    expect(labelForPath("/orgs/o1/projects/p1")).toBe("Overview")
    expect(labelForPath("/orgs/o1")).toBe("Dashboard")
    expect(labelForPath("/orgs/o1/settings")).toBe("Settings")
    expect(labelForPath("/unknown")).toBeUndefined()
  })
})
