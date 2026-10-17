import path from "node:path"

import type { NextConfig } from "next"

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // A nonce-based Content-Security-Policy is planned for the hardening phase (P7).
]

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  cacheComponents: true,
  // `bun run typecheck` (next typegen + tsc) runs as its own CI step. NEXT_SKIP_TYPECHECK=1 skips
  // the duplicate in-build check to cap peak RAM on small machines; the default still checks.
  typescript: { ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === "1" },
  // Build worker count (default: CPU count - 1 = 15 here). NEXT_BUILD_CPUS=1 keeps peak RAM low.
  experimental: process.env.NEXT_BUILD_CPUS
    ? { cpus: Math.max(1, Number(process.env.NEXT_BUILD_CPUS)) }
    : {},
  partialPrefetching: true,
  turbopack: {
    // Pin the workspace root: a stray lockfile in a parent directory must not change it.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
