"use client"

import { useParams } from "next/navigation"

import { ProjectsView } from "@/components/projects/projects-view"

export function ProjectsPageClient() {
  const params = useParams<{ orgId: string }>()
  return <ProjectsView orgId={params.orgId} />
}
