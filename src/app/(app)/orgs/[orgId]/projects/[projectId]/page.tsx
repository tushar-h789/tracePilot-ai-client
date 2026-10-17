"use client"

import { useParams } from "next/navigation"
import { Suspense } from "react"

import { ProjectOverview } from "@/components/dashboard/project-overview"

function Inner() {
  const params = useParams<{ orgId: string; projectId: string }>()
  return <ProjectOverview orgId={params.orgId} projectId={params.projectId} />
}

export default function ProjectOverviewPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  )
}
