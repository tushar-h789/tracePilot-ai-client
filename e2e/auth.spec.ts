import { expect, test, type Page } from "@playwright/test"

/**
 * Real end-to-end flow against the running API (docker compose in the server repo):
 * register -> login -> create org -> see it -> members page -> logout -> protected page redirects.
 * Also asserts: session cookie is HttpOnly/SameSite=Lax, nothing secret in web storage, and the
 * old session cookie is rejected by the API after logout (server-side revocation).
 */
const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
const email = `e2e-${runId}@example.com`
const password = `e2e-local-passphrase-${runId}`
const orgName = `E2E Org ${runId}`

async function storageDump(page: Page) {
  return page.evaluate(() => {
    const dump = (s: Storage) =>
      Array.from({ length: s.length }, (_, i) => {
        const key = s.key(i) ?? ""
        return { key, value: s.getItem(key) ?? "" }
      })
    return { local: dump(window.localStorage), session: dump(window.sessionStorage) }
  })
}

test("register, sign in, create an organization, sign out", async ({ page, context }) => {
  await test.step("register", async () => {
    await page.goto("/register")
    await page.getByLabel("Display name (optional)").fill("E2E User")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByLabel("Confirm password").fill(password)
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL(/\/login\?registered=1$/)
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByText(/you can sign in now/)).toBeVisible()
  })

  await test.step("wrong password shows the generic error", async () => {
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password", { exact: true }).fill("not-the-right-password")
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page.getByText("Invalid email or password.")).toBeVisible()
  })

  await test.step("sign in", async () => {
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL(/\/orgs$/)
    await expect(page.getByRole("heading", { level: 1, name: "Organizations" })).toBeVisible()
    await expect(page.getByText("E2E User")).toBeVisible()
  })

  const cookies = await context.cookies()
  const session = cookies.find((c) => c.name === "tp_session")
  const csrf = cookies.find((c) => c.name === "tp_csrf")

  await test.step("cookie attributes", async () => {
    expect(session, "session cookie").toBeDefined()
    expect(session?.httpOnly).toBe(true)
    expect(session?.sameSite).toBe("Lax")
    expect(session?.path).toBe("/")
    expect(csrf?.httpOnly).toBe(false) // double-submit token must be readable
    expect(csrf?.sameSite).toBe("Lax")
    expect(await page.evaluate(() => document.cookie)).not.toContain("tp_session")
  })

  await test.step("create organization and see it", async () => {
    await expect(page.getByText("No organizations yet")).toBeVisible()
    await page.getByLabel("Organization name").fill(orgName)
    await page.getByRole("button", { name: "Create organization" }).click()
    await expect(page.getByText(orgName)).toBeVisible()
    await page.reload()
    await expect(page.getByText(orgName)).toBeVisible()
    await page.getByRole("link", { name: `Members of ${orgName}` }).click()
    await expect(page.getByRole("heading", { level: 1, name: orgName })).toBeVisible()
    await expect(page.getByText("your role: Owner")).toBeVisible()
    await expect(page.getByRole("cell", { name: /E2E User/ })).toBeVisible()
  })

  await test.step("no tokens in localStorage/sessionStorage", async () => {
    const { local, session: sess } = await storageDump(page)
    for (const item of [...local, ...sess]) {
      expect(item.key).not.toMatch(/token|session|csrf|auth/i)
      expect(item.value).not.toContain(session?.value ?? "<none>")
      expect(item.value).not.toContain(csrf?.value ?? "<none>")
    }
    expect(sess).toHaveLength(0)
  })

  await test.step("overview inside the authenticated shell", async () => {
    await page.goto("/overview")
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible()
    await expect(page.getByText("All systems ready")).toBeVisible()
  })

  await test.step("sign out", async () => {
    await page.getByRole("button", { name: "Sign out" }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect((await context.cookies()).some((c) => c.name === "tp_session")).toBe(false)
  })

  await test.step("protected page redirects to sign in", async () => {
    await page.goto("/orgs")
    await expect(page).toHaveURL(/\/login\?next=%2Forgs$/)
  })

  await test.step("old session cookie is revoked server-side", async () => {
    const response = await page.request.get("/api/v1/auth/me", {
      headers: { cookie: `tp_session=${session?.value ?? ""}` },
    })
    expect(response.status()).toBe(401)
  })
})

test("a stale session cookie is rejected by the server-side check", async ({ page, context }) => {
  await context.addCookies([
    { name: "tp_session", value: "forged-or-expired", url: "http://127.0.0.1:3100" },
  ])
  await page.goto("/orgs")
  await expect(page).toHaveURL(/\/login/)
})
