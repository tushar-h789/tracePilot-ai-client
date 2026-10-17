"use client"

import {
  ArchiveIcon,
  ArrowLeftIcon,
  FolderKanbanIcon,
  SettingsIcon,
  ShieldAlertIcon,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { EmptyState } from "@/components/empty-state"
import { FormAlert } from "@/components/form-alert"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { getOrganization } from "@/lib/api/organizations"
import { createProject, listProjects, setProjectArchived } from "@/lib/api/projects"
import type { OrganizationOut, ProjectOut } from "@/lib/api/types"
import { canManageProjects, ROLE_LABELS } from "@/lib/auth/roles"
import { useApiQuery } from "@/lib/use-api-query"

import { ProjectForm } from "./project-form"

interface Loaded {
  org: OrganizationOut
  projects: ProjectOut[]
  nextCursor: string | null
}

export function projectHref(orgId: string, projectId: string) {
  return `/orgs/${orgId}/projects/${projectId}/settings`
}

export function projectOverviewHref(orgId: string, projectId: string) {
  return `/orgs/${orgId}/projects/${projectId}`
}

export function ProjectsView({ orgId }: { orgId: string }) {
  const [includeArchived, setIncludeArchived] = useState(false)
  const { state, reload, setState } = useApiQuery<Loaded>(async () => {
    const [org, page] = await Promise.all([
      getOrganization(orgId),
      listProjects(orgId, { includeArchived }),
    ])
    return { org: org.data, projects: page.data.items, nextCursor: page.data.next_cursor }
  }, `${orgId}:${includeArchived}`)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (state.status === "loading") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading projects">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (state.status === "error") {
    if (isApiError(state.error) && state.error.status === 404) {
      return (
        <EmptyState
          icon={ShieldAlertIcon}
          title="Organization not found"
          description="It does not exist or you are not a member of it."
        >
          <Link href="/orgs" className={buttonVariants({ variant: "outline" })}>
            Back to organizations
          </Link>
        </EmptyState>
      )
    }
    return (
      <div className="space-y-3">
        <FormAlert message={errorMessage(state.error, "Could not load projects.")} />
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  }

  const { org, projects, nextCursor } = state.data
  const manage = canManageProjects(org.role)

  function update(fn: (data: Loaded) => Loaded) {
    setState((prev) =>
      prev.status === "success" ? { status: "success", data: fn(prev.data) } : prev,
    )
  }

  async function loadMore() {
    if (!nextCursor) return
    setActionError(null)
    setBusy("more")
    try {
      const { data } = await listProjects(orgId, { includeArchived, cursor: nextCursor })
      update((d) => ({
        ...d,
        projects: [...d.projects, ...data.items],
        nextCursor: data.next_cursor,
      }))
    } catch (error) {
      setActionError(errorMessage(error, "Could not load more projects."))
    } finally {
      setBusy(null)
    }
  }

  async function toggleArchived(project: ProjectOut) {
    const archive = project.archived_at === null
    if (
      archive &&
      !window.confirm(
        `Archive ${project.name}? It will stop accepting logs and be hidden from the list. You can restore it later.`,
      )
    ) {
      return
    }
    setActionError(null)
    setBusy(project.id)
    try {
      const { data } = await setProjectArchived(project.id, archive)
      update((d) => ({
        ...d,
        projects:
          archive && !includeArchived
            ? d.projects.filter((p) => p.id !== project.id)
            : d.projects.map((p) => (p.id === project.id ? data : p)),
      }))
    } catch (error) {
      setActionError(errorMessage(error, "Could not update the project."))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${org.name} · Projects`}
        description={`Your role: ${ROLE_LABELS[org.role]}`}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/orgs/${orgId}/members`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Members
            </Link>
            <Link href="/orgs" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ArrowLeftIcon aria-hidden="true" />
              All organizations
            </Link>
          </div>
        }
      />
      <FormAlert message={actionError} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Projects" className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Show archived projects
          </label>
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanbanIcon}
              title="No projects yet"
              description={
                manage
                  ? "Create a project to get an ingestion key and start sending logs."
                  : "An owner or admin can create the first project."
              }
            />
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => {
                const archived = project.archived_at !== null
                return (
                  <li key={project.id}>
                    <Card size="sm">
                      <CardHeader className="flex flex-row items-center justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate">
                            <Link
                              href={projectOverviewHref(orgId, project.id)}
                              className="underline-offset-4 hover:underline"
                              aria-label={`Open ${project.name}`}
                            >
                              {project.name}
                            </Link>
                          </CardTitle>
                          <CardDescription className="truncate">{project.slug}</CardDescription>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <Badge variant="outline">{project.environment}</Badge>
                          {archived ? <Badge variant="secondary">Archived</Badge> : null}
                          <Link
                            href={projectHref(orgId, project.id)}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                            aria-label={`Settings for ${project.name}`}
                          >
                            <SettingsIcon aria-hidden="true" />
                            Settings
                          </Link>
                          {manage ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy === project.id}
                              onClick={() => toggleArchived(project)}
                              aria-label={`${archived ? "Restore" : "Archive"} ${project.name}`}
                            >
                              <ArchiveIcon aria-hidden="true" />
                              {archived ? "Restore" : "Archive"}
                            </Button>
                          ) : null}
                        </div>
                      </CardHeader>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
          {nextCursor ? (
            <Button variant="outline" onClick={loadMore} disabled={busy === "more"}>
              {busy === "more" ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </section>
        {manage ? (
          <Card>
            <CardHeader>
              <CardTitle>New project</CardTitle>
              <CardDescription>Projects group logs and own their ingestion keys.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectForm
                mode="create"
                onSubmit={async (payload) => {
                  const { data } = await createProject(orgId, payload)
                  update((d) => ({ ...d, projects: [data, ...d.projects] }))
                }}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
