import { beforeEach, describe, expect, it, vi } from "vitest"

import { hasActiveFilters, parseLogFilters } from "@/components/logs/log-filters"
import { getLog, getLogFacets, listLogs } from "@/lib/api/logs"
import { getOrgSummary, getRecentErrors } from "@/lib/api/metrics"
import { renameOrganization } from "@/lib/api/organizations"
import { buildQuery } from "@/lib/api/query"
import { formatMs, formatPercent } from "@/lib/format"
import { lastProject, rememberProject } from "@/lib/last-project"
import { nullReasonText } from "@/lib/metric-docs"
import {
  describeRange,
  fromLocalInput,
  parseRange,
  rangeToParams,
  resolveRange,
  toLocalInput,
  validateCustomRange,
} from "@/lib/time-range"

const browser = vi.hoisted(() => ({ browserApi: vi.fn() }))
vi.mock("@/lib/api/browser", () => browser)

beforeEach(() => browser.browserApi.mockReset().mockResolvedValue({ status: 200, data: {} }))

describe("buildQuery", () => {
  it("repeats array keys and drops empties", () => {
    expect(
      buildQuery({ a: 1, level: ["error", "warning"], q: "", x: undefined, y: null, z: false }),
    ).toBe("?a=1&level=error&level=warning")
    expect(buildQuery({})).toBe("")
    expect(buildQuery({ q: "a&b=c" })).toBe("?q=a%26b%3Dc")
  })
})

describe("api paths", () => {
  it("listLogs maps filters to query params", async () => {
    await listLogs("p/1", {
      from: "2026-10-17T00:00:00.000Z",
      to: "2026-10-17T01:00:00.000Z",
      levels: ["error", "critical"],
      services: ["api"],
      traceId: "t1",
      q: "db timeout",
      cursor: "c",
      limit: 50,
    })
    const [path] = browser.browserApi.mock.calls[0]!
    expect(path.startsWith("/projects/p%2F1/logs?")).toBe(true)
    const qs = new URLSearchParams(path.split("?")[1])
    expect(qs.getAll("level")).toEqual(["error", "critical"])
    expect(qs.getAll("service_name")).toEqual(["api"])
    expect(qs.get("trace_id")).toBe("t1")
    expect(qs.get("q")).toBe("db timeout")
    expect(qs.get("cursor")).toBe("c")
    expect(qs.get("limit")).toBe("50")
  })

  it("other endpoints", async () => {
    await getLog("p1", 42)
    await getLogFacets("p1", {})
    await getRecentErrors("p1", { from: "a", to: "b" }, 5)
    await getOrgSummary("o1", {})
    await renameOrganization("o1", "New")
    const paths = browser.browserApi.mock.calls.map((c) => c[0])
    expect(paths).toEqual([
      "/projects/p1/logs/42",
      "/projects/p1/logs/facets",
      "/projects/p1/metrics/recent-errors?from=a&to=b&limit=5",
      "/organizations/o1/metrics/summary",
      "/organizations/o1",
    ])
    expect(browser.browserApi.mock.calls[4]![1]).toMatchObject({
      method: "PATCH",
      json: { name: "New" },
    })
  })
})

describe("time ranges", () => {
  const now = new Date("2026-10-17T12:00:00Z")

  it("parses presets and falls back to 24h", () => {
    expect(parseRange(new URLSearchParams("range=7d"))).toEqual({ kind: "preset", preset: "7d" })
    expect(parseRange(new URLSearchParams("range=bogus"))).toEqual({
      kind: "preset",
      preset: "24h",
    })
    expect(parseRange(new URLSearchParams(""))).toEqual({ kind: "preset", preset: "24h" })
  })

  it("accepts only valid custom ranges", () => {
    const ok = "range=custom&from=2026-10-17T00:00:00Z&to=2026-10-17T06:00:00Z"
    expect(parseRange(new URLSearchParams(ok)).kind).toBe("custom")
    const reversed = "range=custom&from=2026-10-17T06:00:00Z&to=2026-10-17T00:00:00Z"
    expect(parseRange(new URLSearchParams(reversed))).toEqual({ kind: "preset", preset: "24h" })
    expect(validateCustomRange("2026-09-01T00:00:00Z", "2026-10-17T00:00:00Z")).toMatch(/30 days/)
    expect(validateCustomRange("", "2026-10-17T00:00:00Z")).toMatch(/both/)
  })

  it("resolves presets relative to now and round-trips URL params", () => {
    expect(resolveRange({ kind: "preset", preset: "1h" }, now)).toEqual({
      from: "2026-10-17T11:00:00.000Z",
      to: "2026-10-17T12:00:00.000Z",
    })
    expect(rangeToParams({ kind: "preset", preset: "24h" }).range).toBeUndefined()
    expect(rangeToParams({ kind: "preset", preset: "6h" }).range).toBe("6h")
    expect(describeRange({ kind: "preset", preset: "30d" })).toBe("Last 30 days")
    const iso = "2026-10-17T06:30:00.000Z"
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso)
    expect(fromLocalInput("nonsense")).toBe("")
  })
})

describe("log filters from the URL", () => {
  it("drops unknown levels, dedupes, caps q", () => {
    const f = parseLogFilters(
      new URLSearchParams(
        `level=error&level=fatal&level=error&service=a&service=a&q=${"x".repeat(250)}`,
      ),
    )
    expect(f.levels).toEqual(["error"])
    expect(f.services).toEqual(["a"])
    expect(f.q).toHaveLength(200)
    expect(hasActiveFilters(f)).toBe(true)
    expect(hasActiveFilters(parseLogFilters(new URLSearchParams("range=7d")))).toBe(false)
  })
})

describe("formatting and docs", () => {
  it("formats", () => {
    expect(formatPercent(0.05)).toBe("5.00%")
    expect(formatPercent(0.5)).toBe("50.0%")
    expect(formatPercent(0)).toBe("0.0%")
    expect(formatMs(12.34)).toBe("12.3 ms")
    expect(formatMs(1234)).toBe("1234 ms")
    expect(formatMs(12_500)).toBe("12.5 s")
    expect(nullReasonText("no_requests")).toMatch(/No requests/)
    expect(nullReasonText("insufficient_samples", 3, 20)).toBe(
      "Only 3 of the 20 samples needed for a reliable percentile.",
    )
    expect(nullReasonText(undefined)).toBe("Not enough data in this range.")
  })

  it("remembers the last project safely", () => {
    window.localStorage.clear()
    expect(lastProject()).toBeNull()
    rememberProject({ orgId: "o1", projectId: "p1" })
    expect(lastProject()).toEqual({ orgId: "o1", projectId: "p1" })
    window.localStorage.setItem("tp:last-project", "{bad json")
    expect(lastProject()).toBeNull()
  })
})
