const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

export function formatCount(value: number): string {
  return integer.format(value)
}

export function formatPercent(fraction: number): string {
  const pct = fraction * 100
  const digits = pct !== 0 && Math.abs(pct) < 10 ? 2 : 1
  return `${pct.toFixed(digits)}%`
}

export function formatMs(value: number): string {
  if (value >= 10_000) return `${(value / 1000).toFixed(1)} s`
  if (value >= 100) return `${Math.round(value)} ms`
  return `${value.toFixed(1)} ms`
}

export function formatBucketLabel(iso: string, bucketSeconds: number): string {
  const d = new Date(iso)
  if (bucketSeconds >= 86_400)
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })
  if (bucketSeconds >= 3_600)
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  })
}
