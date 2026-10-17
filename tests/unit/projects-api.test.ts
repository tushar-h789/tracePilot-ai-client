import { describe, expect, it, vi } from "vitest"

import type { FetchLike } from "@/lib/api/client"
import {
  createIngestionKey,
  createProject,
  getProject,
  listIngestionKeys,
  listProjects,
  revokeIngestionKey,
  rotateIngestionKey,
  setProjectArchived,
  updateProject,
} from "@/lib/api/projects"
import { canManageKeys, canManageProjects, canReadKeys } from "@/lib/auth/roles"
import { projectSchema } from "@/lib/auth/schemas"
import { toProjectPayload } from "@/components/projects/project-form"

function recorder() {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl: FetchLike = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init: init ?? {} })
    return new Response(JSON.stringify({ items: [], next_cursor: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  })
  return { calls, opts: { fetchImpl, cookieString: "tp_csrf=tok" } }
}

describe("projects API", () => {
  it("builds list URLs with filters and an encoded cursor", async () => {
    const { calls, opts } = recorder()
    await listProjects("o 1", {}, opts)
    await listProjects("o1", { includeArchived: true, cursor: "a+b/c=", limit: 10 }, opts)
    expect(calls[0]?.url).toBe("/api/v1/organizations/o%201/projects")
    expect(calls[1]?.url).toBe(
      "/api/v1/organizations/o1/projects?include_archived=true&cursor=a%2Bb%2Fc%3D&limit=10",
    )
  })

  it("sends unsafe requests with CSRF and the right method/body", async () => {
    const { calls, opts } = recorder()
    await createProject("o1", { name: "A", environment: "production", retention_days: 7 }, opts)
    await updateProject("p1", { name: "B" }, opts)
    await setProjectArchived("p1", true, opts)
    await setProjectArchived("p1", false, opts)
    await getProject("p1", opts)
    await listIngestionKeys("p1", true, opts)
    await createIngestionKey("p1", "svc", opts)
    await revokeIngestionKey("p1", "k1", opts)
    await rotateIngestionKey("p1", "k1", 60, opts)
    const summary = calls.map((c) => `${c.init.method ?? "GET"} ${c.url}`)
    expect(summary).toEqual([
      "POST /api/v1/organizations/o1/projects",
      "PATCH /api/v1/projects/p1",
      "POST /api/v1/projects/p1/archive",
      "POST /api/v1/projects/p1/restore",
      "GET /api/v1/projects/p1",
      "GET /api/v1/projects/p1/ingestion-keys?include_revoked=true&limit=100",
      "POST /api/v1/projects/p1/ingestion-keys",
      "POST /api/v1/projects/p1/ingestion-keys/k1/revoke",
      "POST /api/v1/projects/p1/ingestion-keys/k1/rotate",
    ])
    expect(new Headers(calls[0]?.init.headers).get("X-CSRF-Token")).toBe("tok")
    expect(calls[8]?.init.body).toBe(JSON.stringify({ grace_seconds: 60 }))
    expect(calls[6]?.init.body).toBe(JSON.stringify({ name: "svc" }))
  })
})

describe("project form schema and payload", () => {
  it("omits an empty slug and converts retention", () => {
    const values = projectSchema.parse({
      name: " Shop ",
      slug: "",
      environment: "production",
      retentionDays: "14",
    })
    expect(toProjectPayload(values)).toEqual({
      name: "Shop",
      environment: "production",
      retention_days: 14,
    })
    expect(toProjectPayload({ ...values, slug: "shop-1" }).slug).toBe("shop-1")
  })

  it.each([
    [{ slug: "A_B" }, "slug"],
    [{ slug: "-ab" }, "slug"],
    [{ environment: "Prod" }, "environment"],
    [{ retentionDays: "0" }, "retentionDays"],
    [{ retentionDays: "31" }, "retentionDays"],
    [{ retentionDays: "x" }, "retentionDays"],
    [{ name: "  " }, "name"],
  ])("rejects %o", (override, field) => {
    const result = projectSchema.safeParse({
      name: "Shop",
      slug: "",
      environment: "production",
      retentionDays: "7",
      ...override,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual([field])
  })
})

describe("role helpers", () => {
  it("mirrors the server permission matrix", () => {
    expect(
      ["owner", "admin", "member", "viewer"].map((r) => canManageProjects(r as never)),
    ).toEqual([true, true, false, false])
    expect(["owner", "admin", "member", "viewer"].map((r) => canManageKeys(r as never))).toEqual([
      true,
      true,
      false,
      false,
    ])
    expect(["owner", "admin", "member", "viewer"].map((r) => canReadKeys(r as never))).toEqual([
      true,
      true,
      true,
      false,
    ])
  })
})
