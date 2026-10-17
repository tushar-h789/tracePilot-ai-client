"use client"

import { useParams } from "next/navigation"
import { Suspense } from "react"

import { LogsExplorer } from "@/components/logs/logs-explorer"

function Inner() {
  const params = useParams<{ orgId: string; projectId: string }>()
  return <LogsExplorer orgId={params.orgId} projectId={params.projectId} />
}

export default function LogsPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  )
}
