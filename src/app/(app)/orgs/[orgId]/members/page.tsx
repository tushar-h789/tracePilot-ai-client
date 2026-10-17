import type { Metadata } from "next"

import { MembersPageClient } from "./members-page-client"

export const metadata: Metadata = { title: "Members" }

export default function MembersPage() {
  return <MembersPageClient />
}
