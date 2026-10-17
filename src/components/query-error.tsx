import { RotateCwIcon, ShieldAlertIcon } from "lucide-react"
import type { ReactNode } from "react"

import { EmptyState } from "@/components/empty-state"
import { FormAlert } from "@/components/form-alert"
import { Button } from "@/components/ui/button"
import { errorMessage, isApiError } from "@/lib/api/errors"

/** Error state with a retry button; a 404 is shown as "not found or no access". */
export function QueryError({
  error,
  onRetry,
  fallback,
  notFoundTitle = "Not found",
  children,
}: {
  error: unknown
  onRetry: () => void
  fallback: string
  notFoundTitle?: string
  children?: ReactNode
}) {
  if (isApiError(error) && error.status === 404) {
    return (
      <EmptyState
        icon={ShieldAlertIcon}
        title={notFoundTitle}
        description="It does not exist or you do not have access to it."
      >
        {children}
      </EmptyState>
    )
  }
  return (
    <div className="space-y-3" role="alert">
      <FormAlert message={errorMessage(error, fallback)} />
      <Button variant="outline" onClick={onRetry}>
        <RotateCwIcon aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}
