"use client"

import { useParams } from "next/navigation"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import { getOrganization } from "@/lib/api/organizations"
import { listProjects } from "@/lib/api/projects"
import type { OrganizationOut, ProjectOut } from "@/lib/api/types"
import { rememberOrg } from "@/lib/last-org"
import { rememberProject } from "@/lib/last-project"

export interface Workspace {
  orgId: string | null
  projectId: string | null
  org: OrganizationOut | null
  /** Active projects of the current org (first 100), for the switcher and breadcrumbs. */
  projects: ProjectOut[]
  project: ProjectOut | null
  /** Re-fetch org and project names (after a rename). */
  refresh: () => void
}

const WorkspaceContext = createContext<Workspace>({
  orgId: null,
  projectId: null,
  org: null,
  projects: [],
  project: null,
  refresh: () => {},
})

interface Loaded {
  orgId: string
  org: OrganizationOut | null
  projects: ProjectOut[]
}

/**
 * Derives the current org / project from the URL (`/orgs/[orgId]/projects/[projectId]/...`) and
 * loads their names for navigation. UX only: every page still loads its own data and the API
 * authorizes every request.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ orgId?: string; projectId?: string }>()
  const orgId = typeof params?.orgId === "string" ? params.orgId : null
  const projectId = typeof params?.projectId === "string" ? params.projectId : null
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!orgId) return
    let active = true
    rememberOrg(orgId)
    Promise.all([getOrganization(orgId), listProjects(orgId, { limit: 100 })]).then(
      ([org, page]) => {
        if (active) setLoaded({ orgId, org: org.data, projects: page.data.items })
      },
      () => {
        if (active) setLoaded({ orgId, org: null, projects: [] })
      },
    )
    return () => {
      active = false
    }
  }, [orgId, version])

  useEffect(() => {
    if (orgId && projectId) rememberProject({ orgId, projectId })
  }, [orgId, projectId])

  const current = loaded && loaded.orgId === orgId ? loaded : null
  const value: Workspace = {
    orgId,
    projectId,
    org: current?.org ?? null,
    projects: current?.projects ?? [],
    project: current?.projects.find((p) => p.id === projectId) ?? null,
    refresh: () => setVersion((v) => v + 1),
  }
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): Workspace {
  return useContext(WorkspaceContext)
}
