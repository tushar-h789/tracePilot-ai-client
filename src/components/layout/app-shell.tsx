import type { ReactNode } from "react"

import { CurrentUserProvider } from "@/components/auth/current-user"
import { LogoutButton } from "@/components/auth/logout-button"
import { WorkspaceProvider } from "@/components/workspace/workspace-context"
import type { UserOut } from "@/lib/api/types"

import { AppSidebar } from "./app-sidebar"
import { Brand } from "./brand"
import { Breadcrumbs } from "./breadcrumbs"
import { MobileNav } from "./mobile-nav"
import { ProjectSwitcher } from "./project-switcher"

export function AppShell({
  children,
  user = null,
}: {
  children: ReactNode
  user?: UserOut | null
}) {
  return (
    <CurrentUserProvider user={user}>
      <WorkspaceProvider>
        <div className="flex min-h-dvh w-full bg-background">
          <a
            href="#main"
            className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            Skip to content
          </a>
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
              <MobileNav />
              <div className="md:hidden">
                <Brand compact />
              </div>
              <div className="hidden min-w-0 md:block">
                <Breadcrumbs />
              </div>
              <div className="ml-auto flex items-center gap-3">
                <ProjectSwitcher />
                {user ? (
                  <>
                    <span
                      className="hidden text-sm text-muted-foreground lg:inline"
                      title={user.email}
                    >
                      {user.display_name}
                    </span>
                    <LogoutButton />
                  </>
                ) : null}
              </div>
            </header>
            <main id="main" className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </WorkspaceProvider>
    </CurrentUserProvider>
  )
}
