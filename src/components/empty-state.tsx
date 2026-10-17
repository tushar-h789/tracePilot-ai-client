import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
      </span>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
