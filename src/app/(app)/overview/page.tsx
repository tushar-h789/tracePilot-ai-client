import type { Metadata } from "next"

import { ContextRedirect } from "@/components/workspace/context-redirect"

export const metadata: Metadata = { title: "Overview" }

export default function Page() {
  return <ContextRedirect target="overview" />
}
