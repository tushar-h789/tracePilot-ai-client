"use client"

import { ArrowLeftIcon, ShieldAlertIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { useCurrentUser } from "@/components/auth/current-user"
import { EmptyState } from "@/components/empty-state"
import { FormAlert } from "@/components/form-alert"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage, isApiError } from "@/lib/api/errors"
import {
  changeMemberRole,
  getOrganization,
  listMembers,
  removeMember,
} from "@/lib/api/organizations"
import type { MemberOut, OrganizationOut, Role } from "@/lib/api/types"
import { assignableRoles, canEditMember, canManageMembers, ROLE_LABELS } from "@/lib/auth/roles"
import { useApiQuery } from "@/lib/use-api-query"

import { AddMemberForm, SELECT_CLASS } from "./add-member-form"

interface Loaded {
  org: OrganizationOut
  members: MemberOut[]
}

export function MembersManager({ orgId }: { orgId: string }) {
  const currentUserId = useCurrentUser()?.id
  const router = useRouter()
  const { state, reload, setState } = useApiQuery<Loaded>(async () => {
    const [org, members] = await Promise.all([getOrganization(orgId), listMembers(orgId)])
    return { org: org.data, members: members.data.items }
  }, orgId)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (state.status === "loading") {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading members">
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
        <FormAlert message={errorMessage(state.error, "Could not load members.")} />
        <Button variant="outline" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  }

  const { org, members } = state.data
  const myRole = org.role
  const roles = assignableRoles(myRole)

  function replaceMember(updated: MemberOut) {
    setState((prev) =>
      prev.status === "success"
        ? {
            status: "success",
            data: {
              ...prev.data,
              members: prev.data.members.map((m) => (m.user_id === updated.user_id ? updated : m)),
            },
          }
        : prev,
    )
  }

  async function onRoleChange(member: MemberOut, role: Role) {
    setActionError(null)
    setBusy(member.user_id)
    try {
      replaceMember((await changeMemberRole(orgId, member.user_id, role)).data)
      if (member.user_id === currentUserId) reload() // my own role changed: refresh controls
    } catch (error) {
      setActionError(errorMessage(error, "Could not change the role."))
    } finally {
      setBusy(null)
    }
  }

  async function onRemove(member: MemberOut) {
    if (!window.confirm(`Remove ${member.email} from ${org.name}?`)) return
    setActionError(null)
    setBusy(member.user_id)
    try {
      await removeMember(orgId, member.user_id)
      if (member.user_id === currentUserId) {
        router.push("/orgs")
        return
      }
      setState((prev) =>
        prev.status === "success"
          ? {
              status: "success",
              data: {
                ...prev.data,
                members: prev.data.members.filter((m) => m.user_id !== member.user_id),
              },
            }
          : prev,
      )
    } catch (error) {
      setActionError(errorMessage(error, "Could not remove the member."))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={`Members · your role: ${ROLE_LABELS[myRole]}`}
        actions={
          <Link href="/orgs" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeftIcon aria-hidden="true" />
            All organizations
          </Link>
        }
      />
      <FormAlert message={actionError} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Members ({members.length})</CardTitle>
            <CardDescription>
              Roles are enforced by the server; controls you cannot use are hidden.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {members.length === 0 ? (
              <EmptyState icon={UsersIcon} title="No members" description="Nobody is here yet." />
            ) : (
              <table className="w-full min-w-[32rem] text-sm">
                <caption className="sr-only">Organization members</caption>
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Member
                    </th>
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Role
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const editable = canManageMembers(myRole) && canEditMember(myRole, member.role)
                    const options = roles.includes(member.role) ? roles : [member.role, ...roles]
                    return (
                      <tr key={member.user_id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <div className="font-medium">
                            {member.display_name}
                            {member.user_id === currentUserId ? (
                              <span className="ml-1 text-muted-foreground">(you)</span>
                            ) : null}
                          </div>
                          <div className="text-muted-foreground">{member.email}</div>
                        </td>
                        <td className="py-2 pr-3">
                          {editable ? (
                            <select
                              aria-label={`Role of ${member.email}`}
                              className={SELECT_CLASS}
                              value={member.role}
                              disabled={busy === member.user_id}
                              onChange={(e) => onRoleChange(member, e.target.value as Role)}
                            >
                              {options.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {editable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy === member.user_id}
                              onClick={() => onRemove(member)}
                              aria-label={`Remove ${member.email}`}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        {canManageMembers(myRole) ? (
          <Card>
            <CardHeader>
              <CardTitle>Add member</CardTitle>
              <CardDescription>The person must already have an account.</CardDescription>
            </CardHeader>
            <CardContent>
              <AddMemberForm
                orgId={orgId}
                roles={roles}
                onAdded={(m) =>
                  setState((prev) =>
                    prev.status === "success"
                      ? {
                          status: "success",
                          data: { ...prev.data, members: [...prev.data.members, m] },
                        }
                      : prev,
                  )
                }
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
