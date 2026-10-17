import { ScrollTextIcon } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Logs" }

export default function LogsPage() {
  return (
    <>
      <PageHeader
        title="Logs"
        description="Search and filter structured logs by time range, level, service and trace."
      />
      <EmptyState
        icon={ScrollTextIcon}
        title="No logs to show"
        description="Nothing has been ingested. The logs explorer becomes available once ingestion is implemented."
      />
    </>
  )
}
