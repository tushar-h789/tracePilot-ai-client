import {
  ActivityIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  SettingsIcon,
  SirenIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/logs", label: "Logs", icon: ScrollTextIcon },
  { href: "/incidents", label: "Incidents", icon: SirenIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export const BRAND = { name: "TracePilot AI", icon: ActivityIcon }

export function labelForPath(pathname: string): string | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    ?.label
}
