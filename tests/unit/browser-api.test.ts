import { describe, expect, it, vi } from "vitest"

import { login, logout, register } from "@/lib/api/auth"
import { browserApi } from "@/lib/api/browser"
import { readCookie } from "@/lib/api/csrf"
import { errorMessage, problemCode, problemFieldErrors } from "@/lib/api/errors"
import {
  addMember,
  changeMemberRole,
  createOrganization,
  removeMember,
} from "@/lib/api/organizations"
import type { FetchLike } from "@/lib/api/client"

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function recorder(responses: Response[]) {
  const calls: { url: string; init: RequestInit }[] = []
  const fetchImpl: FetchLike = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init: init ?? {} })
    const next = responses.shift()
    if (!next) throw new Error("unexpected request")
    return next
  })
  const at = (i: number) => {
    const call = calls[i]
    if (!call) throw new Error(`no request #${i}`)
    return call
  }
  return { calls, fetchImpl, at }
}

const header = (init: RequestInit, name: string) => new Headers(init.headers).get(name)

describe("readCookie", () => {
  it("parses a cookie string", () => {
    expect(readCookie("tp_csrf", "a=1; tp_csrf=abc.def; b=2")).toBe("abc.def")
    expect(readCookie("tp_csrf", "tp_csrf_other=x")).toBeNull()
    expect(readCookie("x", "x=%E2%9C%93")).toBe("✓")
    expect(readCookie("x", "x=%E2")).toBe("%E2")
  })
})

describe("browserApi", () => {
  it("sends credentials and no CSRF header on safe methods", async () => {
    const { fetchImpl, at } = recorder([json({ ok: true })])
    await browserApi("/auth/me", { fetchImpl, cookieString: "tp_csrf=tok" })
    expect(at(0).url).toBe("/api/v1/auth/me")
    expect(at(0).init.credentials).toBe("include")
    expect(header(at(0).init, "X-CSRF-Token")).toBeNull()
  })

  it("adds the CSRF header from the cookie on unsafe methods", async () => {
    const { fetchImpl, at } = recorder([json({ id: "1" }, 201)])
    await createOrganization("Acme", { fetchImpl, cookieString: "tp_csrf=nonce.sig" })
    expect(at(0).init.method).toBe("POST")
    expect(at(0).init.credentials).toBe("include")
    expect(header(at(0).init, "X-CSRF-Token")).toBe("nonce.sig")
    expect(at(0).init.body).toBe(JSON.stringify({ name: "Acme" }))
  })

  it("fetches a token first when the CSRF cookie is missing", async () => {
    const { calls, fetchImpl, at } = recorder([
      json({ csrf_token: "fresh.sig", header_name: "X-CSRF-Token" }),
      json({ detail: "ok" }, 202),
    ])
    await register(
      { email: "a@example.com", password: "x".repeat(12) },
      { fetchImpl, cookieString: "" },
    )
    expect(calls.map((c) => c.url)).toEqual(["/api/v1/auth/csrf", "/api/v1/auth/register"])
    expect(header(at(1).init, "X-CSRF-Token")).toBe("fresh.sig")
  })

  it("retries exactly once with a fresh token after csrf_failed", async () => {
    const { calls, fetchImpl, at } = recorder([
      json({ status: 403, code: "csrf_failed", detail: "CSRF validation failed." }, 403),
      json({ csrf_token: "new.sig" }),
      json(undefined, 204),
    ])
    await logout({ fetchImpl, cookieString: "tp_csrf=stale.sig" })
    expect(calls).toHaveLength(3)
    expect(header(at(0).init, "X-CSRF-Token")).toBe("stale.sig")
    expect(header(at(2).init, "X-CSRF-Token")).toBe("new.sig")
  })

  it("does not retry other 403s", async () => {
    const { calls, fetchImpl } = recorder([
      json(
        { status: 403, code: "permission_denied", detail: "Only owners can grant the owner role." },
        403,
      ),
    ])
    const error = await addMember(
      "org",
      { email: "b@example.com", role: "owner" },
      {
        fetchImpl,
        cookieString: "tp_csrf=t",
      },
    ).catch((e: unknown) => e)
    expect(calls).toHaveLength(1)
    expect(problemCode(error)).toBe("permission_denied")
    expect(errorMessage(error)).toBe("Only owners can grant the owner role.")
  })

  it("encodes path parameters and uses PATCH/DELETE", async () => {
    const { fetchImpl, at } = recorder([json({ role: "admin" }), json(undefined, 204)])
    await changeMemberRole("o/1", "u?2", "admin", { fetchImpl, cookieString: "tp_csrf=t" })
    await removeMember("o", "u", { fetchImpl, cookieString: "tp_csrf=t" })
    expect(at(0).url).toBe("/api/v1/organizations/o%2F1/members/u%3F2")
    expect(at(0).init.method).toBe("PATCH")
    expect(at(1).init.method).toBe("DELETE")
  })

  it("never stores anything in web storage", async () => {
    const { fetchImpl } = recorder([json({ user: { id: "1" }, session: {} })])
    await login(
      { email: "a@example.com", password: "pw" },
      { fetchImpl, cookieString: "tp_csrf=t" },
    )
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })
})

describe("problem helpers", () => {
  it("maps field errors and hides server internals", async () => {
    const { fetchImpl } = recorder([
      json(
        {
          status: 422,
          detail: "Password does not meet the requirements.",
          errors: [
            { loc: ["body", "password"], msg: "Password must be at least 12 characters long." },
          ],
        },
        422,
      ),
      json({ status: 500, detail: "Traceback: secret" }, 500),
      json({ status: 429, detail: "slow down" }, 429),
    ])
    const opts = { fetchImpl, cookieString: "tp_csrf=t" }
    const e422 = await register({ email: "a@example.com", password: "x" }, opts).catch((e) => e)
    expect(problemFieldErrors(e422)).toEqual({
      password: "Password must be at least 12 characters long.",
    })
    const e500 = await register({ email: "a@example.com", password: "x" }, opts).catch((e) => e)
    expect(errorMessage(e500, "fallback")).toBe("fallback")
    const e429 = await register({ email: "a@example.com", password: "x" }, opts).catch((e) => e)
    expect(errorMessage(e429)).toMatch(/Too many attempts/)
    expect(problemFieldErrors(new Error("x"))).toEqual({})
    expect(problemCode(new Error("x"))).toBeNull()
    expect(errorMessage("nope", "fb")).toBe("fb")
  })
})
