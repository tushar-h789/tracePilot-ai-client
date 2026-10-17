"use client"

import { Building2Icon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { EmptyState } from "@/components/empty-state"
import { FormAlert } from "@/components/form-alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/errors"
import { listOrganizations } from "@/lib/api/organizations"
import type { OrganizationOut } from "@/lib/api/types"
import { ROLE_LABELS } from "@/lib/auth/roles"
import { lastOrg, rememberOrg } from "@/lib/last-org"
import { useApiQuery } from "@/lib/use-api-query"

import { CreateOrganizationForm } from "./create-organization-form"

export function OrganizationsView() {
  const { state, reload, setState } = useApiQuery(
    async () => (await listOrganizations()).data.items,
    "organizations",
  )
  // Read lazily on the client; the list (and badge) only renders after the client-side fetch.
  const [last, setLast] = useState<string | null>(() =>
    typeof window === "undefined" ? null : lastOrg(),
  )

  function onCreated(org: OrganizationOut) {
    rememberOrg(org.id)
    setLast(org.id)
    setState((prev) => ({
      status: "success",
      data: [...(prev.status === "success" ? prev.data : []), org].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section aria-labelledby="org-list-heading" className="space-y-3">
        <h2 id="org-list-heading" className="text-sm font-medium text-muted-foreground">
          Your organizations
        </h2>
        {state.status === "loading" ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading organizations">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : state.status === "error" ? (
          <div className="space-y-3">
            <FormAlert message={errorMessage(state.error, "Could not load organizations.")} />
            <Button variant="outline" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : state.data.length === 0 ? (
          <EmptyState
            icon={Building2Icon}
            title="No organizations yet"
            description="Create your first organization to start inviting your team."
          />
        ) : (
          <ul className="space-y-2">
            {state.data.map((org) => (
              <li key={org.id}>
                <Card size="sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{org.name}</CardTitle>
                      <CardDescription className="truncate">{org.slug}</CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {last === org.id ? <Badge variant="outline">Last opened</Badge> : null}
                      <Badge variant="secondary">{ROLE_LABELS[org.role]}</Badge>
                      <Link
                        href={`/orgs/${org.id}/members`}
                        onClick={() => rememberOrg(org.id)}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                        aria-label={`Members of ${org.name}`}
                      >
                        <UsersIcon aria-hidden="true" />
                        Members
                      </Link>
                    </div>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>New organization</CardTitle>
          <CardDescription>You become its owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm onCreated={onCreated} />
        </CardContent>
      </Card>
    </div>
  )
}
