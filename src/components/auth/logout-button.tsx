"use client"

import { LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { logout } from "@/lib/api/auth"

export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onClick() {
    setPending(true)
    try {
      await logout()
    } catch {
      // Even if the API is unreachable, leave the app; the session expires server-side.
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      <LogOutIcon aria-hidden="true" />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  )
}
