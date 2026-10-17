import { ActivityIcon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { SystemStatus } from "@/components/system-status/system-status"
import { SystemStatusSkeleton } from "@/components/system-status/system-status-view"

export const metadata: Metadata = { title: "Overview" }

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Request volume, error rate, latency and open incidents for a project."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmptyState
            icon={ActivityIcon}
            title="No telemetry yet"
            description="Metrics appear here once a project exists and an application sends logs with an ingestion key. Projects and ingestion arrive in a later phase."
          />
        </div>
        <Suspense fallback={<SystemStatusSkeleton />}>
          <SystemStatus />
        </Suspense>
      </div>
    </>
  )
}
