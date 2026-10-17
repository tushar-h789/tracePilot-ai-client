import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { type Column, SortableTable, sortRows } from "@/components/data-table/sortable-table"
import { TotalsCards } from "@/components/dashboard/totals-cards"
import { StatCard } from "@/components/metrics/stat-card"
import {
  COUNT_SERIES,
  LATENCY_SERIES,
  summarize,
  TimeseriesChart,
} from "@/components/metrics/timeseries-chart"
import { METRICS_DOC_URL } from "@/lib/metric-docs"

import { point, totals } from "./helpers/fixtures"

describe("StatCard", () => {
  it("renders a value with a definition link", () => {
    render(<StatCard label="Requests" metric="requests" value="1,024" hint="2,000 events" />)
    const card = screen.getByRole("group", { name: "Requests" })
    expect(within(card).getByText("1,024")).toBeInTheDocument()
    const info = within(card).getByRole("link", { name: /How Requests is calculated/ })
    expect(info).toHaveAttribute("href", expect.stringContaining(METRICS_DOC_URL))
    expect(info).toHaveAttribute("rel", "noreferrer noopener")
  })

  it("renders — and the reason when the value is null (never a fake 0)", () => {
    render(
      <StatCard
        label="Error rate"
        metric="errorRate"
        value={null}
        nullReason="No requests in this range."
      />,
    )
    expect(screen.getByLabelText("Error rate: not available")).toHaveTextContent("—")
    expect(screen.getByText("No requests in this range.")).toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })
})

describe("TotalsCards", () => {
  it("formats values", () => {
    render(<TotalsCards totals={totals()} />)
    expect(screen.getByText("5.00%")).toBeInTheDocument()
    expect(screen.getByText("181 ms")).toBeInTheDocument()
    expect(screen.getByText(/p50 40.0 ms · p99 900 ms · 100 samples/)).toBeInTheDocument()
  })

  it("explains null error rate and withheld percentiles", () => {
    render(
      <TotalsCards
        totals={totals({
          requests: 0,
          request_errors: 0,
          error_rate: null,
          error_rate_reason: "no_requests",
          latency: {
            p50_ms: null,
            p95_ms: null,
            p99_ms: null,
            samples: 3,
            min_samples: 20,
            reason: "insufficient_samples",
          },
        })}
      />,
    )
    expect(screen.getByLabelText("Error rate: not available")).toBeInTheDocument()
    expect(screen.getByText(/No requests in this range/)).toBeInTheDocument()
    expect(screen.getByLabelText("p95 latency: not available")).toBeInTheDocument()
    expect(
      screen.getByText("Only 3 of the 20 samples needed for a reliable percentile."),
    ).toBeInTheDocument()
  })
})

describe("TimeseriesChart", () => {
  const points = [
    point(0),
    point(1, { requests: 0, errors: 0, samples: 2, p95_ms: null }),
    point(2, { requests: 30, errors: 4 }),
  ]

  it("is a titled, described figure with a data-table fallback", async () => {
    render(
      <TimeseriesChart
        title="Requests and errors"
        points={points}
        bucketSeconds={900}
        series={COUNT_SERIES}
      />,
    )
    const img = screen.getByRole("img", { name: "Requests and errors" })
    expect(img).toHaveAccessibleDescription(
      /Requests: 38 in total, peak 30 per bucket\. Errors: 5 in total/,
    )
    expect(screen.getByText("15 min buckets")).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByText("Show data table"))
    const table = screen.getByRole("table", { name: "Requests and errors values per bucket" })
    const rows = within(table).getAllByRole("row")
    expect(rows).toHaveLength(4)
    expect(within(rows[3]!).getByText("30")).toBeInTheDocument()
    expect(within(table).getByRole("columnheader", { name: "Errors" })).toBeInTheDocument()
  })

  it("shows — for buckets without enough latency samples", () => {
    render(
      <TimeseriesChart title="p95" points={points} bucketSeconds={3600} series={LATENCY_SERIES} />,
    )
    const table = screen.getByRole("table", { hidden: true })
    expect(within(table).getAllByText("—", { exact: true })).toHaveLength(1)
    expect(screen.getByText("1 h buckets")).toBeInTheDocument()
  })

  it("summarizes empty input", () => {
    expect(summarize([], COUNT_SERIES)).toBe("No data points.")
    expect(summarize([point(0, { p95_ms: null })], LATENCY_SERIES)).toBe(
      "p95 latency (ms): no values.",
    )
  })
})

interface Row {
  name: string
  rate: number | null
}
const columns: Column<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
  {
    id: "rate",
    header: "Rate",
    cell: (r) => (r.rate === null ? "—" : String(r.rate)),
    sortValue: (r) => r.rate,
    align: "right",
  },
  { id: "static", header: "Static", cell: () => "x" },
]
const rows: Row[] = [
  { name: "b", rate: 0.5 },
  { name: "a", rate: null },
  { name: "c", rate: 0.1 },
]

describe("SortableTable", () => {
  it("sorts with aria-sort and keeps nulls last", async () => {
    const user = userEvent.setup()
    render(
      <SortableTable
        caption="Rates"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.name}
        initialSort={{ id: "rate", direction: "descending" }}
      />,
    )
    const names = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((r) => within(r).getAllByRole("cell")[0]!.textContent)
    expect(names()).toEqual(["b", "c", "a"])
    expect(screen.getByRole("columnheader", { name: /Rate/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    )
    expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute("aria-sort", "none")
    expect(screen.getByRole("columnheader", { name: "Static" })).not.toHaveAttribute("aria-sort")

    await user.click(screen.getByRole("button", { name: /Rate/ }))
    expect(names()).toEqual(["c", "b", "a"])
    expect(screen.getByRole("columnheader", { name: /Rate/ })).toHaveAttribute(
      "aria-sort",
      "ascending",
    )

    await user.click(screen.getByRole("button", { name: /Name/ }))
    expect(names()).toEqual(["c", "b", "a"])
  })

  it("renders an empty row and sorts pure functions", () => {
    render(
      <SortableTable
        caption="Empty"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.name}
        empty="Nothing"
      />,
    )
    expect(screen.getByText("Nothing")).toBeInTheDocument()
    expect(sortRows(rows, columns[0], "ascending").map((r) => r.name)).toEqual(["a", "b", "c"])
    expect(sortRows(rows, columns[2], "ascending")).toEqual(rows)
  })
})
