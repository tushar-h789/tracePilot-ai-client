import { AlertOctagonIcon, AlertTriangleIcon, BugIcon, InfoIcon, XCircleIcon } from "lucide-react"

import type { LogLevel } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export const LEVELS: readonly LogLevel[] = ["debug", "info", "warning", "error", "critical"]

const STYLES: Record<LogLevel, { className: string; icon: typeof InfoIcon }> = {
  debug: { className: "bg-muted text-muted-foreground", icon: BugIcon },
  info: { className: "bg-info/10 text-info", icon: InfoIcon },
  warning: { className: "bg-warning/10 text-warning", icon: AlertTriangleIcon },
  error: { className: "bg-danger/10 text-danger", icon: XCircleIcon },
  critical: { className: "bg-danger text-white", icon: AlertOctagonIcon },
}

/** Level shown as icon + text (color is never the only signal). */
export function LevelBadge({ level }: { level: LogLevel }) {
  const { className, icon: Icon } = STYLES[level]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium uppercase",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {level}
    </span>
  )
}

export function HttpStatus({ status }: { status: number | null | undefined }) {
  if (status === null || status === undefined)
    return <span className="text-muted-foreground">—</span>
  const tone = status >= 500 ? "text-danger" : status >= 400 ? "text-warning" : "text-success"
  return <span className={cn("font-mono text-xs tabular-nums", tone)}>{status}</span>
}
