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
        title="No incidents"
        description="Incident detection is not enabled yet. Incidents will be listed here when rules detect problems in ingested logs."
      />
    </>
  )
}
