import { expect, test } from "@playwright/test"

test("sign-in page renders an enabled form", async ({ page }) => {
  await page.goto("/login")
  await expect(page).toHaveTitle(/Sign in · TracePilot AI/)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
  await expect(page.getByLabel("Email")).toBeEnabled()
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled()
  await expect(page.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/register")
})

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/login\?next=%2Foverview$/)
})

test("unknown routes render the not-found page", async ({ page }) => {
  const response = await page.goto("/does-not-exist")
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible()
})
