import { expect, test } from "@playwright/test"

test("login placeholder renders", async ({ page }) => {
  await page.goto("/login")
  await expect(page).toHaveTitle(/Sign in · TracePilot AI/)
  await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled()
})

test("home redirects to the overview inside the app shell", async ({ page }) => {
  const response = await page.goto("/")
  expect(response?.status()).toBeLessThan(400)
  await expect(page).toHaveURL(/\/overview$/)
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible()
  // The status card resolves to one of its real states (API may or may not be running).
  await expect(page.getByText(/All systems ready|Degraded|API unreachable/)).toBeVisible()
})

test("unknown routes render the not-found page", async ({ page }) => {
  const response = await page.goto("/does-not-exist")
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
})
