import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GENERIC_LOGIN_ERROR, LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { ApiError } from "@/lib/api/errors"

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  params: new URLSearchParams(),
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push, refresh: nav.refresh }),
  useSearchParams: () => nav.params,
}))

const api = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }))
vi.mock("@/lib/api/auth", () => api)

beforeEach(() => {
  vi.clearAllMocks()
  nav.params = new URLSearchParams()
})

describe("LoginForm", () => {
  it("shows accessible validation errors without calling the API", async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "email-error")
    expect(api.login).not.toHaveBeenCalled()
  })

  it("shows the generic message on 401 and clears the password", async () => {
    api.login.mockRejectedValue(
      new ApiError("http", "x", { status: 401, body: { detail: "anything specific" } }),
    )
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText("Email"), "a@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password")
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByText(GENERIC_LOGIN_ERROR)).toBeInTheDocument()
    expect(screen.queryByText("anything specific")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toHaveValue("")
  })

  it("shows the rate-limit message on 429", async () => {
    api.login.mockRejectedValue(new ApiError("http", "x", { status: 429, body: {} }))
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText("Email"), "a@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "pw")
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByText(/Too many attempts/)).toBeInTheDocument()
  })

  it("redirects to a safe next path after login", async () => {
    nav.params = new URLSearchParams("next=//evil.example")
    api.login.mockResolvedValue({ status: 200, data: {} })
    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText("Email"), " A@Example.com ")
    await userEvent.type(screen.getByLabelText("Password"), "pw")
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/orgs"))
    expect(api.login).toHaveBeenCalledWith({ email: "A@Example.com", password: "pw" })
    expect(nav.refresh).toHaveBeenCalled()
  })

  it("shows the post-registration notice", () => {
    nav.params = new URLSearchParams("registered=1")
    render(<LoginForm />)
    expect(screen.getByText(/you can sign in now/)).toBeInTheDocument()
  })
})

describe("RegisterForm", () => {
  async function fill(password: string, confirm = password) {
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com")
    await userEvent.type(screen.getByLabelText("Password"), password)
    await userEvent.type(screen.getByLabelText("Confirm password"), confirm)
    await userEvent.click(screen.getByRole("button", { name: "Create account" }))
  }

  it("enforces the password length policy client-side", async () => {
    render(<RegisterForm />)
    await fill("short")
    expect(await screen.findByText("Use at least 12 characters.")).toBeInTheDocument()
    expect(api.register).not.toHaveBeenCalled()
  })

  it("requires matching confirmation", async () => {
    render(<RegisterForm />)
    await fill("a-long-enough-pass", "something-else-1")
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument()
  })

  it("registers and sends the user to sign in", async () => {
    api.register.mockResolvedValue({ status: 202, data: { detail: "ok" } })
    render(<RegisterForm />)
    await fill("a-long-enough-pass")
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/login?registered=1"))
    expect(api.register).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "a-long-enough-pass",
      display_name: null,
    })
  })

  it("maps server-side policy errors onto the field", async () => {
    api.register.mockRejectedValue(
      new ApiError("http", "x", {
        status: 422,
        body: {
          detail: "Password does not meet the requirements.",
          errors: [{ loc: ["body", "password"], msg: "This password is too common." }],
        },
      }),
    )
    render(<RegisterForm />)
    await fill("password1234")
    expect(await screen.findByText("This password is too common.")).toBeInTheDocument()
    expect(screen.getByText("Password does not meet the requirements.")).toBeInTheDocument()
  })
})
