import {
  expect,
  request as playwrightRequest,
  test,
  type APIRequestContext,
} from "@playwright/test"

/**
 * Phase 3 flow against the real API: create a project in the UI, create an ingestion key (shown
 * once), prove it is gone after a reload, send a log with it, revoke it in the UI and prove the
 * API now rejects it. Users and orgs are run-unique; nothing is deleted.
 */
const API = process.env.API_BASE_URL ?? "http://localhost:8000/api/v1"
const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
const email = `e2e-projects-${runId}@example.com`
const password = `e2e-local-passphrase-${runId}`
const KEY_RE = /^tp_[0-9a-f]{12}_[A-Za-z0-9_-]{43}$/

async function csrf(context: { cookies: () => Promise<{ name: string; value: string }[]> }) {
  return (await context.cookies()).find((c) => c.name === "tp_csrf")?.value ?? ""
}

async function ingest(api: APIRequestContext, key: string) {
  return api.post(`${API}/ingest/logs`, {
    headers: { Authorization: `Bearer ${key}` },
    data: {
      events: [
        {
          event_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          level: "info",
          service_name: "playwright",
          message: "hello from e2e",
          attributes: { synthetic: true },
        },
      ],
    },
  })
}

test("projects and ingestion keys: create, key shown once, revoke", async ({ page, context }) => {
  // Fresh request context with no cookies: ingest must authenticate by key alone.
  const keyOnly = await playwrightRequest.newContext()
  let orgId = ""

  await test.step("sign up, sign in and create an org through the API", async () => {
    await page.request.get("/api/v1/auth/csrf")
    const reg = await page.request.post("/api/v1/auth/register", {
      headers: { "X-CSRF-Token": await csrf(context) },
      data: { email, password, display_name: "E2E Projects" },
    })
    expect(reg.status()).toBe(202)
    const login = await page.request.post("/api/v1/auth/login", {
      headers: { "X-CSRF-Token": await csrf(context) },
      data: { email, password },
    })
    expect(login.status()).toBe(200)
    const org = await page.request.post("/api/v1/organizations", {
      headers: { "X-CSRF-Token": await csrf(context) },
      data: { name: `E2E Projects ${runId}` },
    })
    expect(org.status()).toBe(201)
    orgId = (await org.json()).id
  })

  await test.step("create a project in the UI", async () => {
    await page.goto(`/orgs/${orgId}/projects`)
    await expect(page.getByText("No projects yet")).toBeVisible()
    await page.getByLabel("Project name").fill("Checkout API")
    await page.getByLabel("Default environment").fill("demo")
    await page.getByRole("button", { name: "Create project" }).click()
    await expect(page.getByText("Checkout API")).toBeVisible()
    await page.reload()
    await page.getByRole("link", { name: "Settings for Checkout API" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Checkout API" })).toBeVisible()
    await expect(page.getByText("No ingestion keys")).toBeVisible()
  })

  let secret = ""
  let prefix = ""
  await test.step("create a key: shown once in a modal", async () => {
    await page.getByLabel("Key name").fill("e2e key")
    await page.getByRole("button", { name: "Create key" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText(/shown only once/)).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Copy" })).toBeVisible()
    secret = await dialog.getByLabel("Ingestion key").inputValue()
    expect(secret).toMatch(KEY_RE)
    prefix = secret.split("_").slice(0, 2).join("_")
    await dialog.getByRole("button", { name: "I have saved the key" }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId("ingestion-key-row").getByText(prefix)).toBeVisible()
    expect(await page.content()).not.toContain(secret)
  })

  await test.step("after a reload only the prefix is visible", async () => {
    await page.reload()
    await expect(page.getByTestId("ingestion-key-row").getByText(prefix)).toBeVisible()
    expect(await page.content()).not.toContain(secret)
    const stored = await page.evaluate(() =>
      JSON.stringify({ ...window.localStorage, ...window.sessionStorage }),
    )
    expect(stored).not.toContain(secret)
  })

  await test.step("the key ingests logs (by key only, no cookies)", async () => {
    const ok = await ingest(keyOnly, secret)
    expect(ok.status()).toBe(202)
    expect(await ok.json()).toMatchObject({ received: 1, accepted: 1, duplicates: 0 })
  })

  await test.step("revoke in the UI with confirmation", async () => {
    page.once("dialog", (d) => d.accept())
    await page.getByRole("button", { name: "Revoke e2e key" }).click()
    await expect(page.getByText("No ingestion keys")).toBeVisible()
    await page.getByLabel("Show revoked and expired keys").check()
    await expect(page.getByTestId("ingestion-key-row").getByText("revoked")).toBeVisible()
  })

  await test.step("the revoked key is rejected with a generic 401", async () => {
    const denied = await ingest(keyOnly, secret)
    expect(denied.status()).toBe(401)
    expect((await denied.json()).code).toBe("invalid_ingestion_key")
  })

  await keyOnly.dispose()
})
