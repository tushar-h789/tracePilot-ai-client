"use client"

import { useParams } from "next/navigation"

import { OrgSettings } from "@/components/organizations/org-settings"

export default function OrgSettingsPage() {
  const params = useParams<{ orgId: string }>()
  return <OrgSettings orgId={params.orgId} />
}
