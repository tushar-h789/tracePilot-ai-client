import {
  ActivityIcon,
  Building2Icon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  SettingsIcon,
  SirenIcon,
  UsersIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Only exact path matches count as active (dashboards that prefix other pages). */
  exact?: boolean
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

export const BRAND = { name: "TracePilot AI", icon: ActivityIcon }

export const orgPaths = (orgId: string) => ({
  dashboard: `/orgs/${orgId}`,
  projects: `/orgs/${orgId}/projects`,
  members: `/orgs/${orgId}/members`,
  settings: `/orgs/${orgId}/settings`,
})

export const projectPaths = (orgId: string, projectId: string) => {
  const base = `/orgs/${orgId}/projects/${projectId}`
  return {
    overview: base,
    logs: `${base}/logs`,
    incidents: `${base}/incidents`,
    settings: `${base}/settings`,
  }
}

/** Sidebar sections for the current context (org and project come from the URL). */
export function buildNav(orgId: string | null, projectId: string | null): NavSection[] {
  const sections: NavSection[] = [
    {
      id: "workspace",
      label: "Workspace",
      items: [{ href: "/orgs", label: "Organizations", icon: Building2Icon, exact: true }],
    },
  ]
  if (orgId) {
    const o = orgPaths(orgId)
    sections.push({
      id: "org",
      label: "Organization",
      items: [
        { href: o.dashboard, label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
        { href: o.projects, label: "Projects", icon: FolderKanbanIcon, exact: true },
        { href: o.members, label: "Members", icon: UsersIcon },
        { href: o.settings, label: "Org settings", icon: SettingsIcon },
      ],
    })
  }
  if (orgId && projectId) {
    const p = projectPaths(orgId, projectId)
    sections.push({
      id: "project",
      label: "Project",
      items: [
        { href: p.overview, label: "Overview", icon: ActivityIcon, exact: true },
        { href: p.logs, label: "Logs", icon: ScrollTextIcon },
        { href: p.incidents, label: "Incidents", icon: SirenIcon },
        { href: p.settings, label: "Project settings", icon: SettingsIcon },
      ],
    })
  }
  return sections
}

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

const PAGE_LABELS: [RegExp, string][] = [
  [/^\/orgs\/[^/]+\/projects\/[^/]+\/logs/, "Logs"],
  [/^\/orgs\/[^/]+\/projects\/[^/]+\/incidents/, "Incidents"],
  [/^\/orgs\/[^/]+\/projects\/[^/]+\/settings/, "Settings"],
  [/^\/orgs\/[^/]+\/projects\/[^/]+$/, "Overview"],
  [/^\/orgs\/[^/]+\/projects$/, "Projects"],
  [/^\/orgs\/[^/]+\/members/, "Members"],
  [/^\/orgs\/[^/]+\/settings/, "Settings"],
  [/^\/orgs\/[^/]+$/, "Dashboard"],
  [/^\/orgs$/, "Organizations"],
  [/^\/overview/, "Overview"],
  [/^\/logs/, "Logs"],
  [/^\/incidents/, "Incidents"],
  [/^\/settings/, "Settings"],
]

export function labelForPath(pathname: string): string | undefined {
  return PAGE_LABELS.find(([re]) => re.test(pathname))?.[1]
}
