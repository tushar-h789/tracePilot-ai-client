"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { UsersIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { describedBy, FormField } from "@/components/form-field"
import { FormAlert } from "@/components/form-alert"
import { PageHeader } from "@/components/layout/page-header"
import { QueryError } from "@/components/query-error"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkspace } from "@/components/workspace/workspace-context"
import { errorMessage } from "@/lib/api/errors"
import { getOrganization, renameOrganization } from "@/lib/api/organizations"
import type { OrganizationOut } from "@/lib/api/types"
import { canManageOrg, ROLE_LABELS } from "@/lib/auth/roles"
import { organizationSchema, type OrganizationValues } from "@/lib/auth/schemas"
import { useApiQuery } from "@/lib/use-api-query"

function RenameForm({
  org,
  onSaved,
}: {
  org: OrganizationOut
  onSaved: (org: OrganizationOut) => void
}) {
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: org.name },
  })

  async function onSubmit(values: OrganizationValues) {
    setMessage(null)
    try {
      const { data } = await renameOrganization(org.id, values.name)
      reset({ name: data.name })
      onSaved(data)
      setMessage({ tone: "success", text: "Organization renamed." })
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, "Could not rename the organization.") })
    }
  }

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-label="Rename organization"
    >
      <FormAlert message={message?.text} tone={message?.tone} />
      <FormField id="org-rename" label="Organization name" error={errors.name?.message}>
        <Input
          id="org-rename"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("org-rename", errors.name?.message)}
          {...register("name")}
        />
      </FormField>
      <p className="text-xs text-muted-foreground">
        The URL slug <code className="font-mono">{org.slug}</code> stays the same.
      </p>
      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? "Saving…" : "Save name"}
      </Button>
    </form>
  )
}

export function OrgSettings({ orgId }: { orgId: string }) {
  const { refresh } = useWorkspace()
  const { state, reload, setState } = useApiQuery<OrganizationOut>(
    async () => (await getOrganization(orgId)).data,
    orgId,
  )

  if (state.status === "loading") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading organization">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full max-w-lg" />
      </div>
    )
  }
  if (state.status === "error") {
    return (
      <QueryError
        error={state.error}
        onRetry={reload}
        fallback="Could not load the organization."
        notFoundTitle="Organization not found"
      />
    )
  }
  const org = state.data
  const manage = canManageOrg(org.role)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization settings"
        description={`${org.name} · your role: ${ROLE_LABELS[org.role]}`}
      />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              {manage
                ? "Owners and admins can rename the organization."
                : "Read-only for your role."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {manage ? (
              <RenameForm
                org={org}
                onSaved={(data) => {
                  setState({ status: "success", data })
                  refresh()
                }}
              />
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{org.name}</dd>
                <dt className="text-muted-foreground">Slug</dt>
                <dd>{org.slug}</dd>
              </dl>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Invite people and manage roles (owner, admin, member, viewer).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/orgs/${orgId}/members`}
              className={buttonVariants({ variant: "outline" })}
            >
              <UsersIcon aria-hidden="true" />
              Manage members
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
