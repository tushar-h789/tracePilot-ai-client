import { redirect } from "next/navigation"
import { Suspense, type ReactNode } from "react"

import { AppShell } from "@/components/layout/app-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/server"

/**
 * Server-side session check for every page in the (app) group. UX only: it decides whether to
 * render or redirect; the API independently authenticates and authorizes every request.
 */
async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const me = await getCurrentUser()
  if (!me) redirect("/login")
  return <AppShell user={me.user}>{children}</AppShell>
}

function ShellFallback() {
  return (
    <div className="flex min-h-dvh w-full" aria-busy="true" aria-label="Loading">
      <div className="hidden w-60 border-r p-4 md:block">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  )
}
