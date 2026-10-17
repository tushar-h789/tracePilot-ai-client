import { SettingsIcon } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Project settings, retention, rules and ingestion keys."
      />
      <EmptyState
        icon={SettingsIcon}
        title="Nothing to configure yet"
        description="Organization, project and ingestion-key settings arrive with authentication and projects."
      />
    </>
  )
}
