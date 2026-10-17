"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useWorkspace } from "@/components/workspace/workspace-context"
import { cn } from "@/lib/utils"

import { buildNav, isActive } from "./nav-items"

export function SidebarNav({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const { orgId, projectId, org, project } = useWorkspace()
  const sections = buildNav(orgId, projectId)
  const sectionTitle = (id: string, label: string) =>
    id === "org" && org ? org.name : id === "project" && project ? project.name : label

  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          <p
            className={cn(
              "truncate px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase",
              collapsed && "sr-only",
            )}
            title={sectionTitle(section.id, section.label)}
          >
            {sectionTitle(section.id, section.label)}
          </p>
          {section.items.map((item) => {
            const active = isActive(item, pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn("size-4 shrink-0", active && "text-primary")}
                />
                <span className={cn(collapsed && "sr-only")}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
