"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { describedBy, FormField } from "@/components/form-field"
import { FormAlert } from "@/components/form-alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { register as registerAccount } from "@/lib/api/auth"
import { errorMessage, problemFieldErrors } from "@/lib/api/errors"
import { PASSWORD_MAX, PASSWORD_MIN, registerSchema, type RegisterValues } from "@/lib/auth/schemas"

const PASSWORD_HINT = `${PASSWORD_MIN}–${PASSWORD_MAX} characters. A long passphrase is best.`

export function RegisterForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(values: RegisterValues) {
    setFormError(null)
    try {
      await registerAccount({
        email: values.email,
        password: values.password,
        display_name: values.displayName || null,
      })
      router.push("/login?registered=1")
    } catch (error) {
      const fields = problemFieldErrors(error)
      if (fields.email) setError("email", { message: fields.email })
      if (fields.password) setError("password", { message: fields.password })
      setFormError(errorMessage(error, "Registration failed. Please try again."))
    }
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-label="Create account"
    >
      <FormAlert message={formError} />
      <FormField
        id="displayName"
        label="Display name (optional)"
        error={errors.displayName?.message}
      >
        <Input
          id="displayName"
          autoComplete="name"
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby={describedBy("displayName", errors.displayName?.message)}
          {...register("displayName")}
        />
      </FormField>
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
      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
        hint={PASSWORD_HINT}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy("password", errors.password?.message, PASSWORD_HINT)}
          {...register("password")}
        />
      </FormField>
      <FormField
        id="confirmPassword"
        label="Confirm password"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          aria-describedby={describedBy("confirmPassword", errors.confirmPassword?.message)}
          {...register("confirmPassword")}
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  )
}
