"use client"

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Brand } from "./brand"
import { SidebarNav } from "./sidebar-nav"

export const SIDEBAR_KEY = "tp:sidebar-collapsed"

// The collapsed flag lives in localStorage; `memory` keeps toggling usable when storage is blocked.
let memory: boolean | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function readCollapsed(): boolean {
  if (memory !== null) return memory
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "1"
  } catch {
    return false
  }
}

function writeCollapsed(next: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0")
    memory = null
  } catch {
    memory = next // storage unavailable: the in-memory value applies for this page
  }
  listeners.forEach((listener) => listener())
}

/** Desktop sidebar (md+): collapsible to an icon rail; the choice is remembered per browser. */
export function AppSidebar() {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false)

  function toggle() {
    writeCollapsed(!collapsed)
  }

  return (
    <aside
      id="app-sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col gap-6 overflow-y-auto border-r bg-sidebar p-3 transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
        <Brand compact={collapsed} />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpenIcon aria-hidden="true" />
          ) : (
            <PanelLeftCloseIcon aria-hidden="true" />
          )}
        </Button>
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  )
}
