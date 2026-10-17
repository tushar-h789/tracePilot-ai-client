import { SirenIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Honest empty state: incidents are not computed yet. */
export function IncidentsPlaceholder() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SirenIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          Incidents
        </CardTitle>
        <CardDescription>Incidents arrive in Phase 5.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Rule-based incident detection and AI-assisted investigations are not enabled yet, so no
        incident count is shown. Errors are listed below.
      </CardContent>
    </Card>
  )
}
