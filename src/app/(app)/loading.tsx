import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  )
}
