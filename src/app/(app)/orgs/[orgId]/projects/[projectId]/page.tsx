import type { Metadata } from "next"

import { ProjectSettingsPageClient } from "./project-settings-page-client"

export const metadata: Metadata = { title: "Project settings" }

export default function ProjectSettingsPage() {
  return <ProjectSettingsPageClient />
}
