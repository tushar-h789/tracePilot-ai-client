import type { Metadata } from "next"

import { ContextRedirect } from "@/components/workspace/context-redirect"

export const metadata: Metadata = { title: "Settings" }

export default function Page() {
  return <ContextRedirect target="settings" />
}
