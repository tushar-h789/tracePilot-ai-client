"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { describedBy, FormField } from "@/components/form-field"
import { FormAlert } from "@/components/form-alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errorMessage, problemFieldErrors } from "@/lib/api/errors"
import type { ProjectOut } from "@/lib/api/types"
import { projectSchema, type ProjectValues } from "@/lib/auth/schemas"

export interface ProjectPayload {
  name: string
  slug?: string
  environment: string
  retention_days: number
}

/** Form values -> API body. An empty slug is omitted so the server derives one from the name. */
export function toProjectPayload(values: ProjectValues): ProjectPayload {
  const payload: ProjectPayload = {
    name: values.name,
    environment: values.environment,
    retention_days: Number(values.retentionDays),
  }
  if (values.slug) payload.slug = values.slug
  return payload
}

const FIELD_FOR_API: Record<string, keyof ProjectValues> = {
  name: "name",
  slug: "slug",
  environment: "environment",
  retention_days: "retentionDays",
}

export function ProjectForm({
  mode,
  initial,
  disabled = false,
  onSubmit,
}: {
  mode: "create" | "edit"
  initial?: ProjectOut
  disabled?: boolean
  onSubmit: (payload: ProjectPayload) => Promise<void>
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const idp = mode === "create" ? "new-project" : "edit-project"
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      environment: initial?.environment ?? "production",
      retentionDays: String(initial?.retention_days ?? 7),
    },
  })

  async function submit(values: ProjectValues) {
    setFormError(null)
    setSaved(false)
    try {
      await onSubmit(toProjectPayload(values))
      if (mode === "create") reset()
      else setSaved(true)
    } catch (error) {
      for (const [field, msg] of Object.entries(problemFieldErrors(error))) {
        const target = FIELD_FOR_API[field]
        if (target) setError(target, { message: msg })
      }
      setFormError(
        errorMessage(
          error,
          mode === "create" ? "Could not create the project." : "Could not save the project.",
        ),
      )
    }
  }

  const fields: {
    name: keyof ProjectValues
    label: string
    placeholder?: string
    hint?: string
  }[] = [
    { name: "name", label: "Project name", placeholder: "Checkout API" },
    {
      name: "slug",
      label: mode === "create" ? "Slug (optional)" : "Slug",
      placeholder: mode === "create" ? "derived from the name" : undefined,
    },
    { name: "environment", label: "Default environment", placeholder: "production" },
    { name: "retentionDays", label: "Log retention (days, 1–30)" },
  ]

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={handleSubmit(submit)}
      aria-label={mode === "create" ? "Create project" : "Edit project"}
    >
      <FormAlert message={formError} />
      <FormAlert message={saved ? "Project saved." : null} tone="success" />
      {fields.map((field) => {
        const id = `${idp}-${field.name}`
        const error = errors[field.name]?.message
        return (
          <FormField key={field.name} id={id} label={field.label} error={error}>
            <Input
              id={id}
              placeholder={field.placeholder}
              inputMode={field.name === "retentionDays" ? "numeric" : undefined}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(id, error)}
              {...register(field.name)}
            />
          </FormField>
        )
      })}
      <Button type="submit" disabled={disabled || isSubmitting}>
        {mode === "create"
          ? isSubmitting
            ? "Creating…"
            : "Create project"
          : isSubmitting
            ? "Saving…"
            : "Save changes"}
      </Button>
    </form>
  )
}
