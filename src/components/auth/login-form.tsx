"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { describedBy, FormField } from "@/components/form-field"
import { FormAlert } from "@/components/form-alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { login } from "@/lib/api/auth"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { safeNextPath } from "@/lib/auth/redirect"
import { loginSchema, type LoginValues } from "@/lib/auth/schemas"

export const GENERIC_LOGIN_ERROR = "Invalid email or password."

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      await login(values)
      router.replace(safeNextPath(params.get("next")))
      router.refresh()
    } catch (error) {
      // 401 is always the same generic message (no hint whether the email exists).
      setFormError(
        isApiError(error) && error.status === 401
          ? GENERIC_LOGIN_ERROR
          : errorMessage(error, "Sign-in failed. Please try again."),
      )
      resetField("password")
    }
  }

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)} aria-label="Sign in">
      {params.get("registered") === "1" ? (
        <FormAlert
          tone="success"
          message="Registration received. If the email was not already registered, you can sign in now."
        />
      ) : null}
      <FormAlert message={formError} />
      <FormField id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy("email", errors.email?.message)}
          {...register("email")}
        />
      </FormField>
      <FormField id="password" label="Password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy("password", errors.password?.message)}
          {...register("password")}
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>
    </form>
  )
}
