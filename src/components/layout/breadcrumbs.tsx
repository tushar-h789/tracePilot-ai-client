"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useWorkspace } from "@/components/workspace/workspace-context"

import { labelForPath, orgPaths, projectPaths } from "./nav-items"

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const { orgId, projectId, org, project } = useWorkspace()
  const crumbs: Crumb[] = []
  if (orgId) {
    crumbs.push({ label: "Organizations", href: "/orgs" })
    crumbs.push({ label: org?.name ?? "Organization", href: orgPaths(orgId).dashboard })
  }
  if (orgId && projectId) {
    crumbs.push({
      label: project?.name ?? "Project",
      href: projectPaths(orgId, projectId).overview,
    })
  }
  const page = labelForPath(pathname) ?? "Page"
  const last = crumbs.at(-1)
  if (!last || last.href !== pathname) crumbs.push({ label: page })
  else crumbs[crumbs.length - 1] = { label: last.label }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem className={i < crumbs.length - 2 ? "hidden lg:inline-flex" : undefined}>
              {crumb.href ? (
                <Link href={crumb.href} className="max-w-48 truncate hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <BreadcrumbPage className="max-w-48 truncate">{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
