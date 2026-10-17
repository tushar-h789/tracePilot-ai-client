import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CurrentUserProvider } from "@/components/auth/current-user"
import { MembersManager } from "@/components/organizations/members-manager"
import { OrganizationsView } from "@/components/organizations/organizations-view"
import { ApiError } from "@/lib/api/errors"
import type { MemberOut, Role } from "@/lib/api/types"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
const api = vi.hoisted(() => ({
  getOrganization: vi.fn(),
  listMembers: vi.fn(),
  changeMemberRole: vi.fn(),
  removeMember: vi.fn(),
  addMember: vi.fn(),
  listOrganizations: vi.fn(),
  createOrganization: vi.fn(),
}))
vi.mock("@/lib/api/organizations", () => api)

const member = (id: string, role: Role): MemberOut => ({
  user_id: id,
  email: `${id}@example.com`,
  display_name: id,
  role,
  joined_at: "2026-10-17T00:00:00Z",
})

function setup(myRole: Role) {
  api.getOrganization.mockResolvedValue({
    data: { id: "o1", name: "Acme", slug: "acme-1", role: myRole, created_at: "" },
  })
  api.listMembers.mockResolvedValue({
    data: { items: [member("me", myRole), member("boss", "owner"), member("dev", "member")] },
  })
  return render(
    <CurrentUserProvider
      user={{ id: "me", email: "me@example.com", display_name: "me", created_at: "" }}
    >
      <MembersManager orgId="o1" />
    </CurrentUserProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe("MembersManager", () => {
  it("admin: can manage non-owners, cannot edit owners or grant owner", async () => {
    setup("admin")
    expect(await screen.findByRole("heading", { name: "Acme" })).toBeInTheDocument()
    expect(screen.getByRole("form", { name: "Add member" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Role of boss@example.com")).not.toBeInTheDocument()
    const devRole = screen.getByLabelText("Role of dev@example.com")
    expect(within(devRole).queryByRole("option", { name: "Owner" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove dev@example.com" })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Remove boss@example.com" }),
    ).not.toBeInTheDocument()
  })

  it("member: read-only view", async () => {
    setup("member")
    expect(await screen.findByText("Members (3)")).toBeInTheDocument()
    expect(screen.queryByRole("form", { name: "Add member" })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument()
  })

  it("shows the server's refusal when a change is denied", async () => {
    setup("owner")
    api.changeMemberRole.mockRejectedValue(
      new ApiError("http", "x", {
        status: 409,
        body: { detail: "An organization must keep at least one owner." },
      }),
    )
    await userEvent.selectOptions(await screen.findByLabelText("Role of boss@example.com"), "admin")
    expect(
      await screen.findByText("An organization must keep at least one owner."),
    ).toBeInTheDocument()
  })

  it("renders a not-found state for orgs the user cannot see", async () => {
    api.getOrganization.mockRejectedValue(new ApiError("http", "x", { status: 404, body: {} }))
    api.listMembers.mockRejectedValue(new ApiError("http", "x", { status: 404, body: {} }))
    render(<MembersManager orgId="other" />)
    expect(await screen.findByText("Organization not found")).toBeInTheDocument()
  })
})

describe("OrganizationsView", () => {
  it("shows the empty state, creates an org and lists it", async () => {
    api.listOrganizations.mockResolvedValue({ data: { items: [] } })
    api.createOrganization.mockResolvedValue({
      data: { id: "o9", name: "New Co", slug: "new-co-abc123", role: "owner", created_at: "" },
    })
    render(<OrganizationsView />)
    expect(await screen.findByText("No organizations yet")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Organization name"), "New Co")
    await userEvent.click(screen.getByRole("button", { name: "Create organization" }))
    expect(await screen.findByText("New Co")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Members of New Co" })).toHaveAttribute(
      "href",
      "/orgs/o9/members",
    )
    expect(window.localStorage.getItem("tp:last-org-id")).toBe("o9")
  })

  it("shows an error state with retry", async () => {
    api.listOrganizations.mockRejectedValueOnce(
      new ApiError("network", "The API could not be reached."),
    )
    api.listOrganizations.mockResolvedValueOnce({ data: { items: [] } })
    render(<OrganizationsView />)
    expect(await screen.findByText("The API could not be reached.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("No organizations yet")).toBeInTheDocument()
  })
})
