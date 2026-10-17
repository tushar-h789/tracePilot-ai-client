import { useSyncExternalStore } from "react"
import { vi } from "vitest"

/**
 * In-memory stand-in for next/navigation: `router.replace` updates the search params and
 * re-renders subscribers, so URL-synced components behave like in the browser.
 */
export function createNavigation(pathname: string, params: Record<string, string> = {}) {
  let search = new URLSearchParams()
  const listeners = new Set<() => void>()
  const set = (qs: string) => {
    search = new URLSearchParams(qs)
    listeners.forEach((l) => l())
  }
  const replace = vi.fn((url: string) => set(url.includes("?") ? (url.split("?")[1] ?? "") : ""))
  const push = vi.fn()
  const router = {
    replace,
    push,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }
  return {
    set,
    get search() {
      return search
    },
    replace,
    push,
    module: {
      usePathname: () => pathname,
      useParams: () => params,
      useRouter: () => router,
      useSearchParams: () =>
        useSyncExternalStore(
          (l) => {
            listeners.add(l)
            return () => listeners.delete(l)
          },
          () => search,
          () => search,
        ),
      redirect: vi.fn(),
    },
  }
}
