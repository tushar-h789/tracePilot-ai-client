import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { OrganizationsView } from "@/components/organizations/organizations-view"

export const metadata: Metadata = { title: "Organizations" }

export default function OrganizationsPage() {
  return (
    <>
      <PageHeader
        title="Organizations"
        description="Choose an organization to manage, or create a new one."
      />
      <OrganizationsView />
    </>
  )
}
