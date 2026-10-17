import type { Metadata } from "next"

import { Brand } from "@/components/layout/brand"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-3">
        <Brand />
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Authentication is not available yet; it arrives in the next phase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" aria-describedby="login-disabled-note">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled
              className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled
              className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
            />
          </div>
          <Button type="submit" className="w-full" disabled>
            Sign in
          </Button>
          <p id="login-disabled-note" className="text-xs text-muted-foreground">
            This form is a placeholder and does not submit anywhere.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
