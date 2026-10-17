"use client"

import { useParams } from "next/navigation"

import { MembersManager } from "@/components/organizations/members-manager"

export function MembersPageClient() {
  const params = useParams<{ orgId: string }>()
  return <MembersManager orgId={params.orgId} />
}
