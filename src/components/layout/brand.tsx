import Link from "next/link"

import { BRAND } from "./nav-items"

export function Brand() {
  const Icon = BRAND.icon
  return (
    <Link href="/overview" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      {BRAND.name}
    </Link>
  )
}
