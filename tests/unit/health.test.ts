import { describe, expect, it, vi } from "vitest"

import type { FetchLike } from "@/lib/api/client"
import { getSystemStatus } from "@/lib/api/health"
import type { ReadinessResponse } from "@/lib/api/types"

const ok: ReadinessResponse = {
  status: "ok",
  checks: { database: { status: "ok", latency_ms: 1.5 }, redis: { status: "ok", latency_ms: 0.4 } },
}
const degraded: ReadinessResponse = {
  status: "unavailable",
  checks: {
    database: { status: "ok", latency_ms: 1.5 },
    redis: { status: "error", latency_ms: 2 },
  },
}

const respond = (body: unknown, status: number) =>
  vi.fn<FetchLike>().mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe("getSystemStatus", () => {
  it("is ok when the API is ready", async () => {
    await expect(
      getSystemStatus({ baseUrl: "http://api.test", fetchImpl: respond(ok, 200) }),
    ).resolves.toEqual({
      state: "ok",
      readiness: ok,
    })
  })

  it("is degraded (not an exception) on 503", async () => {
    const status = await getSystemStatus({
      baseUrl: "http://api.test",
      fetchImpl: respond(degraded, 503),
    })
    expect(status).toEqual({ state: "degraded", readiness: degraded })
  })

  it("is unreachable when the request fails", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(new TypeError("ECONNREFUSED"))
    const status = await getSystemStatus({ baseUrl: "http://api.test", fetchImpl })
    expect(status.state).toBe("unreachable")
  })

  it("is unreachable for unexpected statuses", async () => {
    const status = await getSystemStatus({
      baseUrl: "http://api.test",
      fetchImpl: respond({}, 500),
    })
    expect(status).toMatchObject({ state: "unreachable" })
  })
})
