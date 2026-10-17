import Link from "next/link"

import { BRAND } from "./nav-items"

export function Brand({ compact = false }: { compact?: boolean }) {
  const Icon = BRAND.icon
  return (
    <Link
      href="/overview"
      aria-label={compact ? BRAND.name : undefined}
      className="flex items-center gap-2 text-sm font-semibold tracking-tight"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      {compact ? null : BRAND.name}
    </Link>
  )
}
