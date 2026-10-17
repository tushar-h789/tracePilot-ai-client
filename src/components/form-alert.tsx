import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"

export function FormAlert({
  message,
  tone = "error",
}: {
  message: string | null | undefined
  tone?: "error" | "success"
}) {
  if (!message) return null
  const Icon = tone === "error" ? CircleAlertIcon : CircleCheckIcon
  return (
    <Alert variant={tone === "error" ? "destructive" : "default"} aria-live="polite">
      <Icon aria-hidden="true" />
      <AlertDescription className={tone === "error" ? undefined : "text-foreground"}>
        {message}
      </AlertDescription>
    </Alert>
  )
}
