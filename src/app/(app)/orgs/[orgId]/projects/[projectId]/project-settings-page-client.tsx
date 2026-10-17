"use client"

import { useParams } from "next/navigation"

import { ProjectSettings } from "@/components/projects/project-settings"

export function ProjectSettingsPageClient() {
  const params = useParams<{ orgId: string; projectId: string }>()
  return <ProjectSettings orgId={params.orgId} projectId={params.projectId} />
}
