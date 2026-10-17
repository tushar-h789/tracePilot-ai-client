"use client"

import { useParams } from "next/navigation"
import { Suspense } from "react"

import { OrgDashboard } from "@/components/dashboard/org-dashboard"

function Inner() {
  const params = useParams<{ orgId: string }>()
  return <OrgDashboard orgId={params.orgId} />
}

export default function OrgDashboardPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  )
}
