import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { IngestionKeysManager } from "@/components/projects/ingestion-keys-manager"
import { ProjectSettings } from "@/components/projects/project-settings"
import { ProjectsView } from "@/components/projects/projects-view"
import { ApiError } from "@/lib/api/errors"
import type { IngestionKeyOut, ProjectOut, Role } from "@/lib/api/types"

const orgs = vi.hoisted(() => ({ getOrganization: vi.fn() }))
const api = vi.hoisted(() => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  setProjectArchived: vi.fn(),
  listIngestionKeys: vi.fn(),
  createIngestionKey: vi.fn(),
  revokeIngestionKey: vi.fn(),
  rotateIngestionKey: vi.fn(),
}))
vi.mock("@/lib/api/organizations", () => orgs)
vi.mock("@/lib/api/projects", () => api)

// Fake keys, built from pieces so secret scanners do not flag them.
const SECRET = "tp_" + "0123456789ab" + "_" + "S".repeat(43)
const SECRET2 = "tp_" + "ba9876543210" + "_" + "R".repeat(43)

const project = (over: Partial<ProjectOut> = {}): ProjectOut => ({
  id: "p1",
  org_id: "o1",
  name: "Checkout",
  slug: "checkout",
  environment: "production",
  retention_days: 7,
  archived_at: null,
  created_at: "2026-10-17T00:00:00Z",
  updated_at: "2026-10-17T00:00:00Z",
  role: "owner",
  ...over,
})

const key = (over: Partial<IngestionKeyOut> = {}): IngestionKeyOut => ({
  id: "k1",
  project_id: "p1",
  name: "svc",
  prefix: "tp_0123456789ab",
  status: "active",
  created_by: null,
  created_at: "2026-10-17T00:00:00Z",
  last_used_at: null,
  expires_at: null,
  revoked_at: null,
  replaced_by_id: null,
  ...over,
})

function org(role: Role) {
  orgs.getOrganization.mockResolvedValue({
    data: { id: "o1", name: "Acme", slug: "acme", role, created_at: "" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, "confirm").mockReturnValue(true)
})

describe("ProjectsView", () => {
  it("owner: empty state, create, archive", async () => {
    org("owner")
    api.listProjects.mockResolvedValue({ data: { items: [], next_cursor: null } })
    api.createProject.mockResolvedValue({ data: project() })
    api.setProjectArchived.mockResolvedValue({
      data: project({ archived_at: "2026-10-17T01:00:00Z" }),
    })
    const user = userEvent.setup()
    render(<ProjectsView orgId="o1" />)
    expect(await screen.findByText("No projects yet")).toBeInTheDocument()

    await user.type(screen.getByLabelText("Project name"), "Checkout")
    await user.click(screen.getByRole("button", { name: "Create project" }))
    expect(api.createProject).toHaveBeenCalledWith("o1", {
      name: "Checkout",
      environment: "production",
      retention_days: 7,
    })
    expect(await screen.findByText("Checkout")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Settings for Checkout" })).toHaveAttribute(
      "href",
      "/orgs/o1/projects/p1",
    )

    await user.click(screen.getByRole("button", { name: "Archive Checkout" }))
    expect(window.confirm).toHaveBeenCalled()
    expect(api.setProjectArchived).toHaveBeenCalledWith("p1", true)
    await waitFor(() => expect(screen.queryByText("Checkout")).not.toBeInTheDocument())
  })

  it("does not archive when the confirmation is cancelled", async () => {
    org("admin")
    vi.mocked(window.confirm).mockReturnValue(false)
    api.listProjects.mockResolvedValue({ data: { items: [project()], next_cursor: null } })
    const user = userEvent.setup()
    render(<ProjectsView orgId="o1" />)
    await user.click(await screen.findByRole("button", { name: "Archive Checkout" }))
    expect(api.setProjectArchived).not.toHaveBeenCalled()
  })

  it("viewer: read only, can include archived and load more", async () => {
    org("viewer")
    api.listProjects
      .mockResolvedValueOnce({ data: { items: [project({ role: "viewer" })], next_cursor: null } })
      .mockResolvedValueOnce({
        data: {
          items: [project({ id: "p2", name: "Old", archived_at: "2026-10-17T00:00:00Z" })],
          next_cursor: "c1",
        },
      })
      .mockResolvedValueOnce({
        data: { items: [project({ id: "p3", name: "Older" })], next_cursor: null },
      })
    const user = userEvent.setup()
    render(<ProjectsView orgId="o1" />)
    expect(await screen.findByText("Checkout")).toBeInTheDocument()
    expect(screen.queryByRole("form", { name: "Create project" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Archive/ })).not.toBeInTheDocument()

    await user.click(screen.getByLabelText("Show archived projects"))
    expect(await screen.findByText("Archived")).toBeInTheDocument()
    expect(api.listProjects).toHaveBeenLastCalledWith("o1", { includeArchived: true })
    await user.click(screen.getByRole("button", { name: "Load more" }))
    expect(await screen.findByText("Older")).toBeInTheDocument()
    expect(api.listProjects).toHaveBeenLastCalledWith("o1", { includeArchived: true, cursor: "c1" })
  })

  it("shows not found for foreign orgs and a retry for other errors", async () => {
    orgs.getOrganization.mockRejectedValue(new ApiError("http", "x", { status: 404 }))
    api.listProjects.mockResolvedValue({ data: { items: [], next_cursor: null } })
    const { unmount } = render(<ProjectsView orgId="o9" />)
    expect(await screen.findByText("Organization not found")).toBeInTheDocument()
    unmount()
    orgs.getOrganization.mockRejectedValue(new ApiError("network", "The API could not be reached."))
    render(<ProjectsView orgId="o9" />)
    expect(await screen.findByText("The API could not be reached.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })
})

describe("ProjectSettings", () => {
  it("viewer: read-only details and no key list", async () => {
    api.getProject.mockResolvedValue({ data: project({ role: "viewer" }) })
    render(<ProjectSettings orgId="o1" projectId="p1" />)
    expect(await screen.findByText("Read-only for your role.")).toBeInTheDocument()
    expect(screen.getByText("Viewers cannot see ingestion keys.")).toBeInTheDocument()
    expect(api.listIngestionKeys).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: /Archive project/ })).not.toBeInTheDocument()
  })

  it("member: sees key metadata but no management controls", async () => {
    api.getProject.mockResolvedValue({ data: project({ role: "member" }) })
    api.listIngestionKeys.mockResolvedValue({ data: { items: [key()], next_cursor: null } })
    render(<ProjectSettings orgId="o1" projectId="p1" />)
    expect(await screen.findByText("tp_0123456789ab")).toBeInTheDocument()
    expect(screen.queryByRole("form", { name: "Create ingestion key" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Revoke svc" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Rotate svc" })).not.toBeInTheDocument()
  })

  it("owner: edits and archives the project", async () => {
    api.getProject.mockResolvedValue({ data: project() })
    api.listIngestionKeys.mockResolvedValue({ data: { items: [], next_cursor: null } })
    api.updateProject.mockResolvedValue({
      data: project({ name: "Checkout API", updated_at: "2026-10-17T02:00:00Z" }),
    })
    api.setProjectArchived.mockResolvedValue({
      data: project({ archived_at: "2026-10-17T03:00:00Z" }),
    })
    const user = userEvent.setup()
    render(<ProjectSettings orgId="o1" projectId="p1" />)
    const name = await screen.findByLabelText("Project name")
    await user.clear(name)
    await user.type(name, "Checkout API")
    await user.click(screen.getByRole("button", { name: "Save changes" }))
    expect(api.updateProject).toHaveBeenCalledWith("p1", {
      name: "Checkout API",
      slug: "checkout",
      environment: "production",
      retention_days: 7,
    })
    expect(await screen.findByRole("heading", { name: "Checkout API" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Archive project" }))
    expect(await screen.findByRole("button", { name: "Restore project" })).toBeInTheDocument()
    expect(screen.getByText(/rejects new logs and its settings are read-only/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
    expect(screen.queryByRole("form", { name: "Create ingestion key" })).not.toBeInTheDocument()
  })

  it("maps server field errors onto the form", async () => {
    api.getProject.mockResolvedValue({ data: project() })
    api.listIngestionKeys.mockResolvedValue({ data: { items: [], next_cursor: null } })
    api.updateProject.mockRejectedValue(
      new ApiError("http", "x", {
        status: 409,
        body: { detail: "A project with this slug already exists in the organization." },
      }),
    )
    const user = userEvent.setup()
    render(<ProjectSettings orgId="o1" projectId="p1" />)
    await user.click(await screen.findByRole("button", { name: "Save changes" }))
    expect(await screen.findByText(/slug already exists/)).toBeInTheDocument()
  })

  it("shows not found for a foreign project", async () => {
    api.getProject.mockRejectedValue(new ApiError("http", "x", { status: 404 }))
    render(<ProjectSettings orgId="o1" projectId="p9" />)
    expect(await screen.findByText("Project not found")).toBeInTheDocument()
  })
})

describe("IngestionKeysManager", () => {
  it("shows a new key once with a copy button; closing removes it from the page", async () => {
    api.listIngestionKeys
      .mockResolvedValueOnce({ data: { items: [], next_cursor: null } })
      .mockResolvedValue({ data: { items: [key()], next_cursor: null } })
    api.createIngestionKey.mockResolvedValue({ data: { key: key(), secret: SECRET } })
    const user = userEvent.setup() // installs its own clipboard stub: override it afterwards
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    render(<IngestionKeysManager projectId="p1" canManage archived={false} />)
    expect(await screen.findByText("No ingestion keys")).toBeInTheDocument()

    await user.type(screen.getByLabelText("Key name"), "svc")
    await user.click(screen.getByRole("button", { name: "Create key" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText("Ingestion key")).toHaveValue(SECRET)
    expect(within(dialog).getByText(/shown only once/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Copy" }))
    expect(writeText).toHaveBeenCalledWith(SECRET)
    expect(await within(dialog).findByText("Copied")).toBeInTheDocument()

    await user.click(within(dialog).getByRole("button", { name: "I have saved the key" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(document.body.innerHTML).not.toContain(SECRET)
    expect(await screen.findByText("tp_0123456789ab")).toBeInTheDocument()
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0)
  })

  it("reports a failed copy", async () => {
    api.listIngestionKeys.mockResolvedValue({ data: { items: [], next_cursor: null } })
    api.createIngestionKey.mockResolvedValue({ data: { key: key(), secret: SECRET } })
    const user = userEvent.setup()
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    })
    render(<IngestionKeysManager projectId="p1" canManage archived={false} />)
    await user.type(await screen.findByLabelText("Key name"), "svc")
    await user.click(screen.getByRole("button", { name: "Create key" }))
    await user.click(await screen.findByRole("button", { name: "Copy" }))
    expect(await screen.findByText(/Copy failed/)).toBeInTheDocument()
  })

  it("revokes after confirmation and rotates showing the new key", async () => {
    api.listIngestionKeys.mockResolvedValue({ data: { items: [key()], next_cursor: null } })
    api.revokeIngestionKey.mockResolvedValue({ data: key({ status: "revoked" }) })
    api.rotateIngestionKey.mockResolvedValue({
      data: {
        key: key({ id: "k2", prefix: "tp_ba9876543210" }),
        secret: SECRET2,
        previous_key: key(),
      },
    })
    const user = userEvent.setup()
    render(<IngestionKeysManager projectId="p1" canManage archived={false} />)

    vi.mocked(window.confirm).mockReturnValueOnce(false)
    await user.click(await screen.findByRole("button", { name: "Revoke svc" }))
    expect(api.revokeIngestionKey).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Revoke svc" }))
    expect(api.revokeIngestionKey).toHaveBeenCalledWith("p1", "k1")

    await user.click(await screen.findByRole("button", { name: "Rotate svc" }))
    expect(api.rotateIngestionKey).toHaveBeenCalledWith("p1", "k1", 0)
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Key rotated")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Ingestion key")).toHaveValue(SECRET2)
  })

  it("shows revoked keys on request and surfaces API errors", async () => {
    api.listIngestionKeys
      .mockResolvedValueOnce({ data: { items: [key()], next_cursor: null } })
      .mockResolvedValueOnce({
        data: {
          items: [key(), key({ id: "k0", name: "old", status: "revoked" })],
          next_cursor: null,
        },
      })
    api.createIngestionKey.mockRejectedValue(
      new ApiError("http", "x", {
        status: 409,
        body: { detail: "This project already has the maximum number of active keys (10)." },
      }),
    )
    const user = userEvent.setup()
    render(<IngestionKeysManager projectId="p1" canManage archived={false} />)
    await user.click(await screen.findByLabelText("Show revoked and expired keys"))
    expect(await screen.findByText("revoked")).toBeInTheDocument()
    expect(api.listIngestionKeys).toHaveBeenLastCalledWith("p1", true)
    expect(screen.queryByRole("button", { name: "Revoke old" })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText("Key name"), "x")
    await user.click(screen.getByRole("button", { name: "Create key" }))
    expect(await screen.findByText(/maximum number of active keys/)).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows a retry when the list fails", async () => {
    api.listIngestionKeys.mockRejectedValue(new ApiError("timeout", "The API did not respond."))
    render(<IngestionKeysManager projectId="p1" canManage={false} archived={false} />)
    expect(await screen.findByText("The API did not respond.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })
})
