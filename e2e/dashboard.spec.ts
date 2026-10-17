import { expect, request as playwrightRequest, test } from "@playwright/test"

/**
 * Phase 4 full flow against the real API: register -> org -> project -> key (all in the UI),
 * ingest synthetic logs with the key, then check the dashboards show non-zero metrics and the
 * logs explorer filters (level, service, search), paginates and opens a detail drawer.
 * Everything is run-unique (e2e-dash-<runId>); nothing is deleted.
 */
const API = process.env.API_BASE_URL ?? "http://localhost:8000/api/v1"
const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
const email = `e2e-dash-${runId}@example.com`
const password = `e2e-local-passphrase-${runId}`
const orgName = `E2E Dash ${runId}`
const token = `needle${runId.replace(/\D/g, "")}`
const TOTAL = 120

function events() {
  const now = Date.now()
  return Array.from({ length: TOTAL }, (_, i) => {
    const service = ["checkout", "payments", "search"][i % 3]
    const error = i % 10 === 0
    return {
      event_id: crypto.randomUUID(),
      timestamp: new Date(now - (i + 1) * 15_000).toISOString(),
      level: error ? "error" : i % 7 === 0 ? "warning" : "info",
      service_name: service,
      message: error
        ? `${service} upstream failed ${token} #${i}`
        : `GET /api/${service} completed #${i}`,
      http_method: "GET",
      http_path: `/api/${service}`,
      http_status: error ? 503 : 200,
      duration_ms: 20 + (i % 40) * 5,
      trace_id: `trace${String(i).padStart(4, "0")}`,
      attributes: { synthetic: true, source: "playwright", index: i },
    }
  })
}

test("register to dashboard: ingest synthetic logs and explore them", async ({ page }) => {
  test.setTimeout(120_000)
  let orgUrl = ""
  let projectUrl = ""
  let secret = ""

  await test.step("register and sign in", async () => {
    await page.goto("/register")
    await page.getByLabel("Display name (optional)").fill("E2E Dash")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByLabel("Confirm password").fill(password)
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL(/\/login\?registered=1$/)
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL(/\/orgs$/)
  })

  await test.step("create an organization and open its dashboard", async () => {
    await page.getByLabel("Organization name").fill(orgName)
    await page.getByRole("button", { name: "Create organization" }).click()
    await page.getByRole("link", { name: `Dashboard of ${orgName}` }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
    await expect(page.getByText("No projects yet")).toBeVisible()
    orgUrl = new URL(page.url()).pathname
  })

  await test.step("create a project and an ingestion key", async () => {
    await page.getByRole("link", { name: "Create a project" }).click()
    await page.getByLabel("Project name").fill("Shop API")
    await page.getByLabel("Default environment").fill("demo")
    await page.getByRole("button", { name: "Create project" }).click()
    await page.getByRole("link", { name: "Settings for Shop API" }).click()
    await page.getByLabel("Key name").fill("e2e dashboard key")
    await page.getByRole("button", { name: "Create key" }).click()
    const dialog = page.getByRole("dialog")
    secret = await dialog.getByLabel("Ingestion key").inputValue()
    expect(secret).toMatch(/^tp_/)
    await dialog.getByRole("button", { name: "I have saved the key" }).click()
    projectUrl = new URL(page.url()).pathname.replace(/\/settings$/, "")
  })

  await test.step("ingest synthetic logs with the key only", async () => {
    const keyOnly = await playwrightRequest.newContext()
    const res = await keyOnly.post(`${API}/ingest/logs`, {
      headers: { Authorization: `Bearer ${secret}` },
      data: { events: events() },
    })
    expect(res.status()).toBe(202)
    expect(await res.json()).toMatchObject({ accepted: TOTAL })
    await keyOnly.dispose()
  })

  await test.step("org dashboard shows non-zero metrics", async () => {
    await page.goto(orgUrl)
    await expect(page.getByTestId("stat-requests")).toContainText(String(TOTAL))
    await expect(page.getByTestId("stat-errors")).toContainText("12")
    await expect(page.getByTestId("stat-errorRate")).toContainText("10.0%")
    await expect(page.getByRole("table", { name: "Metrics per project" })).toContainText("Shop API")
    await expect(page.getByText("Incidents arrive in Phase 5.").first()).toBeVisible()
  })

  await test.step("project overview: cards, charts with table fallback, services", async () => {
    await page.goto(projectUrl)
    await expect(page.getByTestId("stat-requests")).toContainText(String(TOTAL))
    await expect(page.getByTestId("stat-latency")).toContainText("ms")
    await expect(page.getByRole("img", { name: "Requests and errors" })).toBeVisible()
    await page.getByText("Show data table").first().click()
    await expect(
      page.getByRole("table", { name: "Requests and errors values per bucket" }),
    ).toBeVisible()
    await expect(page.getByRole("table", { name: "Per-service metrics" })).toContainText("payments")
  })

  await test.step("logs: filter by level=error", async () => {
    await page.goto(`${projectUrl}/logs`)
    await expect(page.getByTestId("log-row")).toHaveCount(50)
    await page.getByRole("button", { name: /^Level/ }).click()
    await page.locator("label").filter({ hasText: /error/ }).click()
    await page.keyboard.press("Escape")
    await expect(page).toHaveURL(/level=error/)
    await expect(page.getByTestId("log-row")).toHaveCount(12)
    for (const row of await page.getByTestId("log-row").all()) {
      await expect(row).toContainText("error")
    }
    await page.getByRole("button", { name: "Clear filters" }).first().click()
    await expect(page.getByTestId("log-row")).toHaveCount(50)
  })

  await test.step("logs: filter by service", async () => {
    await page.getByRole("button", { name: /^Service/ }).click()
    await page
      .locator("label")
      .filter({ hasText: /search/ })
      .click()
    await page.keyboard.press("Escape")
    await expect(page).toHaveURL(/service=search/)
    await expect(page.getByText(/Showing 40 logs · end of results/)).toBeVisible()
    await page.getByRole("button", { name: "Clear filters" }).first().click()
  })

  await test.step("logs: debounced text search", async () => {
    await page.getByLabel("Search messages").fill(token.toUpperCase())
    await expect(page).toHaveURL(new RegExp(`q=${token}`, "i"))
    await expect(page.getByTestId("log-row")).toHaveCount(12)
    await page.getByRole("button", { name: "Clear filters" }).first().click()
    await expect(page.getByTestId("log-row")).toHaveCount(50)
  })

  await test.step("logs: load more pages with the cursor", async () => {
    await page.getByRole("button", { name: "Load 50 more" }).click()
    await expect(page.getByTestId("log-row")).toHaveCount(100)
    await page.getByRole("button", { name: "Load 50 more" }).click()
    await expect(page.getByTestId("log-row")).toHaveCount(TOTAL)
    await expect(page.getByText(/end of results/)).toBeVisible()
  })

  await test.step("logs: open a detail drawer", async () => {
    await page.getByTestId("log-row").nth(0).getByRole("button").click()
    const drawer = page.getByRole("dialog")
    await expect(drawer.getByRole("heading", { name: "Log event" })).toBeVisible()
    await expect(drawer.getByTestId("log-attributes")).toContainText('"source": "playwright"')
    await expect(page).toHaveURL(/log=\d+/)
    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
  })
})

test("mobile: sidebar drawer navigation", async ({ page }) => {
  const mobileEmail = `e2e-mobile-${runId}@example.com`
  await page.setViewportSize({ width: 390, height: 844 })
  await page.request.get("/api/v1/auth/csrf")
  const csrf = async () =>
    (await page.context().cookies()).find((c) => c.name === "tp_csrf")?.value ?? ""
  expect(
    (
      await page.request.post("/api/v1/auth/register", {
        headers: { "X-CSRF-Token": await csrf() },
        data: { email: mobileEmail, password },
      })
    ).status(),
  ).toBe(202)
  expect(
    (
      await page.request.post("/api/v1/auth/login", {
        headers: { "X-CSRF-Token": await csrf() },
        data: { email: mobileEmail, password },
      })
    ).status(),
  ).toBe(200)
  const org = await page.request.post("/api/v1/organizations", {
    headers: { "X-CSRF-Token": await csrf() },
    data: { name: `E2E Mobile ${runId}` },
  })
  const orgId = (await org.json()).id

  await page.goto(`/orgs/${orgId}`)
  await expect(page.locator("#app-sidebar")).toBeHidden()
  await page.getByRole("button", { name: "Open navigation" }).click()
  const drawer = page.getByRole("dialog")
  await expect(drawer.getByRole("link", { name: "Projects" })).toBeVisible()
  await drawer.getByRole("link", { name: "Org settings" }).click()
  await expect(page).toHaveURL(new RegExp(`/orgs/${orgId}/settings$`))
  await expect(drawer).toBeHidden()
  await expect(page.getByRole("heading", { level: 1, name: "Organization settings" })).toBeVisible()
})
