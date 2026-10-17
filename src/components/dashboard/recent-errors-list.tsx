import Link from "next/link"

import { HttpStatus, LevelBadge } from "@/components/logs/level-badge"
import type { LogEventSummary } from "@/lib/api/types"
import { formatTimestamp } from "@/lib/format"

export interface RecentErrorItem extends LogEventSummary {
  project_name?: string
  project_id?: string
}

/** Compact list of error events; each links to the log in the explorer. */
export function RecentErrorsList({
  items,
  hrefFor,
}: {
  items: RecentErrorItem[]
  hrefFor: (item: RecentErrorItem) => string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No errors in this range.</p>
  }
  return (
    <ul className="divide-y" aria-label="Recent errors">
      {items.map((item) => (
        <li key={`${item.project_name ?? ""}-${item.id}`} className="py-2">
          <Link
            href={hrefFor(item)}
            className="block rounded-sm outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <LevelBadge level={item.level} />
              <HttpStatus status={item.http_status} />
              <span className="font-medium text-foreground">{item.service_name}</span>
              {item.project_name ? <span>· {item.project_name}</span> : null}
              <time dateTime={item.timestamp} className="ml-auto">
                {formatTimestamp(item.timestamp)}
              </time>
            </div>
            <p className="mt-1 line-clamp-2 text-sm break-words">{item.message}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
