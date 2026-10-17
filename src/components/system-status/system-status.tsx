import { connection } from "next/server"

import { getSystemStatus } from "@/lib/api/health"

import { SystemStatusView } from "./system-status-view"

/** Server Component: queries the API at request time (never prerendered). Wrap in <Suspense>. */
export async function SystemStatus() {
  await connection()
  const status = await getSystemStatus()
  return <SystemStatusView status={status} />
}
