import type { Metadata } from "next"
import { Suspense } from "react"

import { OrgDashboardFromParams } from "@/components/dashboard/org-dashboard"
import { SystemStatus } from "@/components/system-status/system-status"
import { SystemStatusSkeleton } from "@/components/system-status/system-status-view"

export const metadata: Metadata = { title: "Dashboard" }

export default function OrgDashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense>
        <OrgDashboardFromParams />
      </Suspense>
      <section aria-label="System status" className="max-w-md">
        <Suspense fallback={<SystemStatusSkeleton />}>
          <SystemStatus />
        </Suspense>
      </section>
    </div>
  )
}
