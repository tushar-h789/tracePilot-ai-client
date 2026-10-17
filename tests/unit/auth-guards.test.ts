// @vitest-environment node
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { safeNextPath } from "@/lib/auth/redirect"
import { assignableRoles, canEditMember, canManageMembers } from "@/lib/auth/roles"
import { isProtectedPath } from "@/lib/auth/session-cookie"
import { proxy } from "@/proxy"

const cookieJar = new Map<string, string>()
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
  }),
}))

afterEach(() => {
  cookieJar.clear()
  vi.unstubAllGlobals()
})

describe("safeNextPath (no open redirect)", () => {
  it.each([
    [null, "/orgs"],
    ["/orgs/1/members", "/orgs/1/members"],
    ["https://evil.example", "/orgs"],
    ["//evil.example", "/orgs"],
    ["/\\evil.example", "/orgs"],
    ["/login?next=/x", "/orgs"],
    ["relative", "/orgs"],
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })
})

describe("proxy (optimistic redirect)", () => {
  it("redirects protected paths without a session cookie to /login with next", () => {
    const res = proxy(new NextRequest("http://localhost:3100/orgs/abc/members?x=1"))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get("location") ?? "")
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("next")).toBe("/orgs/abc/members?x=1")
  })

  it("lets requests with a session cookie through (validation happens server-side)", () => {
    const req = new NextRequest("http://localhost:3100/overview", {
      headers: { cookie: "tp_session=anything" },
    })
    expect(proxy(req).headers.get("location")).toBeNull()
  })

  it("ignores public paths", () => {
    expect(proxy(new NextRequest("http://localhost:3100/login")).headers.get("location")).toBeNull()
    expect(isProtectedPath("/orgsx")).toBe(false)
    expect(isProtectedPath("/orgs")).toBe(true)
  })
})

describe("getCurrentUser (server)", () => {
  it("returns null without calling the API when there is no session cookie", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const { getCurrentUser } = await import("@/lib/auth/server")
    expect(await getCurrentUser()).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("forwards only the session cookie and returns the user", async () => {
    cookieJar.set("tp_session", "opaque")
    cookieJar.set("tp_csrf", "should-not-be-sent")
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ user: { id: "u1" }, session: {} }), {
          headers: { "content-type": "application/json" },
        }),
    )
    vi.stubGlobal("fetch", fetchSpy)
    const { getCurrentUser } = await import("@/lib/auth/server")
    const me = await getCurrentUser()
    expect(me?.user.id).toBe("u1")
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("http://localhost:8000/api/v1/auth/me")
    expect(new Headers(init.headers).get("cookie")).toBe("tp_session=opaque")
  })

  it("returns null on 401 and rethrows other failures", async () => {
    cookieJar.set("tp_session", "revoked")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 401 })),
    )
    const { getCurrentUser } = await import("@/lib/auth/server")
    expect(await getCurrentUser()).toBeNull()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    )
    await expect(getCurrentUser()).rejects.toThrow(/status 500/)
  })
})

describe("role helpers (UI hints only)", () => {
  it("mirror the server matrix", () => {
    expect(canManageMembers("owner")).toBe(true)
    expect(canManageMembers("admin")).toBe(true)
    expect(canManageMembers("member")).toBe(false)
    expect(canManageMembers("viewer")).toBe(false)
    expect(assignableRoles("admin")).not.toContain("owner")
    expect(assignableRoles("owner")).toContain("owner")
    expect(assignableRoles("member")).toEqual([])
    expect(canEditMember("admin", "owner")).toBe(false)
    expect(canEditMember("admin", "member")).toBe(true)
    expect(canEditMember("owner", "owner")).toBe(true)
    expect(canEditMember("viewer", "viewer")).toBe(false)
  })
})
