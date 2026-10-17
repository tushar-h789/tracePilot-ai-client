import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    // Keep memory use low on the dev machine.
    pool: "threads",
    maxWorkers: 2,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/components/**"],
      exclude: ["src/components/ui/**", "src/lib/api/schema.d.ts"],
      reporter: ["text", "text-summary"],
    },
  },
})
