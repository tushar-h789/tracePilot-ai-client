import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`

/**
 * E2E tests run against the production build (`bun run build` first) AND the real API
 * (`docker compose up -d` + `docker compose run --rm migrate` in tracePilot-ai-server).
 * The Next.js server proxies /api/v1 to API_BASE_URL (default http://localhost:8000/api/v1).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `HOSTNAME=127.0.0.1 PORT=${PORT} bun run start`,
        url: `${baseURL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
