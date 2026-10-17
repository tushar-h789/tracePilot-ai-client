"use client"

import { ArchiveIcon, ArrowLeftIcon, ShieldAlertIcon } from "lucide-react"
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
import { getProject, setProjectArchived, updateProject } from "@/lib/api/projects"
import type { ProjectOut } from "@/lib/api/types"
import { canManageKeys, canManageProjects, canReadKeys, ROLE_LABELS } from "@/lib/auth/roles"
import { useApiQuery } from "@/lib/use-api-query"

import { IngestionKeysManager } from "./ingestion-keys-manager"
import { ProjectForm } from "./project-form"

export function ProjectSettings({ orgId, projectId }: { orgId: string; projectId: string }) {
  const { state, reload, setState } = useApiQuery<ProjectOut>(
    async () => (await getProject(projectId)).data,
    projectId,
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const back = (
    <Link
      href={`/orgs/${orgId}/projects`}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <ArrowLeftIcon aria-hidden="true" />
      All projects
    </Link>
  )

  if (state.status === "loading") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading project">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (state.status === "error") {
    if (isApiError(state.error) && state.error.status === 404) {
      return (
        <EmptyState
          icon={ShieldAlertIcon}
          title="Project not found"
          description="It does not exist or you do not have access to it."
        >
          {back}
        </EmptyState>
      )
    }
    return (
      <div className="space-y-3">
        <FormAlert message={errorMessage(state.error, "Could not load the project.")} />
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  }

  const project = state.data
  const archived = project.archived_at !== null
  const manage = canManageProjects(project.role)
  const set = (data: ProjectOut) => setState({ status: "success", data })

  async function toggleArchived() {
    if (
      !archived &&
      !window.confirm(
        `Archive ${project.name}? Ingestion stops immediately (its keys get 401) and the project is hidden from the list.`,
      )
    ) {
      return
    }
    setActionError(null)
    setBusy(true)
    try {
      set((await setProjectArchived(project.id, !archived)).data)
    } catch (error) {
      setActionError(errorMessage(error, "Could not update the project."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={`Project settings · ${project.slug} · your role: ${ROLE_LABELS[project.role]}`}
        actions={back}
      />
      {archived ? (
        <FormAlert message="This project is archived: it rejects new logs and its settings are read-only." />
      ) : null}
      <FormAlert message={actionError} />
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                {manage ? "Owners and admins can edit projects." : "Read-only for your role."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {manage ? (
                <ProjectForm
                  key={project.updated_at}
                  mode="edit"
                  initial={project}
                  disabled={archived}
                  onSubmit={async (payload) => set((await updateProject(project.id, payload)).data)}
                />
              ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Slug</dt>
                  <dd>{project.slug}</dd>
                  <dt className="text-muted-foreground">Environment</dt>
                  <dd>{project.environment}</dd>
                  <dt className="text-muted-foreground">Retention</dt>
                  <dd>{project.retention_days} days</dd>
                </dl>
              )}
            </CardContent>
          </Card>
          {manage ? (
            <Card>
              <CardHeader>
                <CardTitle>{archived ? "Restore project" : "Archive project"}</CardTitle>
                <CardDescription>
                  {archived
                    ? "Restoring re-enables ingestion with the existing active keys."
                    : "Archived projects keep their data but reject new logs."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Button
                  variant={archived ? "outline" : "destructive"}
                  disabled={busy}
                  onClick={toggleArchived}
                >
                  <ArchiveIcon aria-hidden="true" />
                  {archived ? "Restore project" : "Archive project"}
                </Button>
                {archived ? <Badge variant="secondary">Archived</Badge> : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
        {canReadKeys(project.role) ? (
          <IngestionKeysManager
            projectId={project.id}
            canManage={canManageKeys(project.role)}
            archived={archived}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ingestion keys</CardTitle>
              <CardDescription>Viewers cannot see ingestion keys.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
