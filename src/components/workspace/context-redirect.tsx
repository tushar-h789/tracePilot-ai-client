"use client"

import { Building2Icon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useSyncExternalStore } from "react"

import { EmptyState } from "@/components/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { lastOrg } from "@/lib/last-org"
import { lastProject } from "@/lib/last-project"

type Target = "overview" | "logs" | "incidents" | "settings"

function destination(target: Target): string | null {
  const project = lastProject()
  const org = lastOrg()
  if (project) {
    const base = `/orgs/${project.orgId}/projects/${project.projectId}`
    return target === "overview" ? base : `${base}/${target}`
  }
  if (org && (target === "overview" || target === "settings")) {
    return target === "overview" ? `/orgs/${org}` : `/orgs/${org}/settings`
  }
  return org ? `/orgs/${org}/projects` : null
}

const noSubscription = () => () => {}

/** Legacy top-level routes forward to the last opened org/project, or explain what to pick. */
export function ContextRedirect({ target }: { target: Target }) {
  const router = useRouter()
  // undefined on the server (unknown yet), null when there is nowhere to go.
  const href = useSyncExternalStore<string | null | undefined>(
    noSubscription,
    () => destination(target),
    () => undefined,
  )
  useEffect(() => {
    if (href) router.replace(href)
  }, [router, href])
  const none = href === null

  if (!none) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Opening your workspace">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  return (
    <EmptyState
      icon={Building2Icon}
      title="Choose an organization"
      description="Open an organization and a project to see dashboards and logs."
    >
      <Link href="/orgs" className={buttonVariants()}>
        Go to organizations
      </Link>
    </EmptyState>
  )
}
