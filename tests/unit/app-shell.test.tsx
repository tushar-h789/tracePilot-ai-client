import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/layout/app-shell"
import { labelForPath, NAV_ITEMS } from "@/components/layout/nav-items"

vi.mock("next/navigation", () => ({ usePathname: () => "/incidents" }))

describe("AppShell", () => {
  it("renders navigation, breadcrumbs and content", () => {
    render(
      <AppShell>
        <p>page content</p>
      </AppShell>,
    )
    const nav = screen.getByRole("navigation", { name: "Main" })
    for (const item of NAV_ITEMS) {
      expect(within(nav).getByRole("link", { name: item.label })).toHaveAttribute("href", item.href)
    }
    expect(within(nav).getByRole("link", { name: "Incidents" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(within(nav).getByRole("link", { name: "Logs" })).not.toHaveAttribute("aria-current")
    expect(screen.getByText("page content")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main")
    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument()
  })

  it("maps paths to labels for breadcrumbs", () => {
    expect(labelForPath("/logs")).toBe("Logs")
    expect(labelForPath("/incidents/123")).toBe("Incidents")
    expect(labelForPath("/unknown")).toBeUndefined()
  })
})
