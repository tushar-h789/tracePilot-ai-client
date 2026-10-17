import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OrgSettings } from "@/components/organizations/org-settings"
import { ApiError } from "@/lib/api/errors"
import type { Role } from "@/lib/api/types"

const orgs = vi.hoisted(() => ({ getOrganization: vi.fn(), renameOrganization: vi.fn() }))
vi.mock("@/lib/api/organizations", () => orgs)

const org = (role: Role, name = "Acme") => ({
  data: { id: "o1", name, slug: "acme", role, created_at: "" },
})

beforeEach(() => vi.clearAllMocks())

describe("OrgSettings", () => {
  it("owner renames the organization", async () => {
    orgs.getOrganization.mockResolvedValue(org("owner"))
    orgs.renameOrganization.mockResolvedValue(org("owner", "Acme Labs"))
    const user = userEvent.setup()
    render(<OrgSettings orgId="o1" />)
    const input = await screen.findByLabelText("Organization name")
    expect(screen.getByRole("button", { name: "Save name" })).toBeDisabled()
    await user.clear(input)
    await user.type(input, "Acme Labs")
    await user.click(screen.getByRole("button", { name: "Save name" }))
    expect(orgs.renameOrganization).toHaveBeenCalledWith("o1", "Acme Labs")
    expect(await screen.findByText("Organization renamed.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Manage members" })).toHaveAttribute(
      "href",
      "/orgs/o1/members",
    )
  })

  it("shows server errors", async () => {
    orgs.getOrganization.mockResolvedValue(org("admin"))
    orgs.renameOrganization.mockRejectedValue(
      new ApiError("http", "x", { status: 403, body: { detail: "Insufficient role." } }),
    )
    const user = userEvent.setup()
    render(<OrgSettings orgId="o1" />)
    const input = await screen.findByLabelText("Organization name")
    await user.type(input, " 2")
    await user.click(screen.getByRole("button", { name: "Save name" }))
    expect(await screen.findByText("Insufficient role.")).toBeInTheDocument()
  })

  it("viewer sees a read-only summary", async () => {
    orgs.getOrganization.mockResolvedValue(org("viewer"))
    render(<OrgSettings orgId="o1" />)
    expect(await screen.findByText("Read-only for your role.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Organization name")).not.toBeInTheDocument()
  })

  it("not found", async () => {
    orgs.getOrganization.mockRejectedValue(new ApiError("http", "x", { status: 404 }))
    render(<OrgSettings orgId="o1" />)
    expect(await screen.findByText("Organization not found")).toBeInTheDocument()
  })
})
