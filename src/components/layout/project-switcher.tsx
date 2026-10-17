"use client"

import { usePathname, useRouter } from "next/navigation"
import { useId } from "react"

import { useWorkspace } from "@/components/workspace/workspace-context"

import { projectPaths } from "./nav-items"

/** Switch project within the current org, staying on the same kind of page. */
export function ProjectSwitcher() {
  const id = useId()
  const router = useRouter()
  const pathname = usePathname()
  const { orgId, projectId, projects } = useWorkspace()
  if (!orgId || projects.length === 0) return null

  function onChange(next: string) {
    if (!orgId) return
    if (next === "") {
      router.push(`/orgs/${orgId}/projects`)
      return
    }
    const paths = projectPaths(orgId, next)
    const section = projectId ? (pathname.split(`/projects/${projectId}`)[1] ?? "") : ""
    const target = section.startsWith("/logs")
      ? paths.logs
      : section.startsWith("/settings")
        ? paths.settings
        : section.startsWith("/incidents")
          ? paths.incidents
          : paths.overview
    router.push(target)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Project
      </label>
      <select
        id={id}
        value={projectId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 max-w-44 truncate rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">{projectId ? "All projects…" : "Choose a project…"}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}
