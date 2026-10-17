"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { UserOut } from "@/lib/api/types"

const CurrentUserContext = createContext<UserOut | null>(null)

export function CurrentUserProvider({
  user,
  children,
}: {
  user: UserOut | null
  children: ReactNode
}) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>
}

/** The signed-in user resolved server-side by the (app) layout (display only). */
export function useCurrentUser(): UserOut | null {
  return useContext(CurrentUserContext)
}
