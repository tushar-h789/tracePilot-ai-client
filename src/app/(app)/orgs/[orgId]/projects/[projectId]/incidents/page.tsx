import { SirenIcon } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Incidents" }

export default function IncidentsPage() {
  return (
    <>
      <PageHeader
        title="Incidents"
        description="Rule-based incidents with timelines and AI-assisted investigations."
      />
      <EmptyState
        icon={SirenIcon}
        title="Incidents arrive in Phase 5"
        description="Incident detection is not enabled yet, so nothing is counted or listed here. Errors are visible in the project overview and the logs explorer."
      />
    </>
  )
}
