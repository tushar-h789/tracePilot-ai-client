import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Link href="/overview" className="text-sm font-medium underline underline-offset-4">
        Go to overview
      </Link>
    </div>
  )
}
