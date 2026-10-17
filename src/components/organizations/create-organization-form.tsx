"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { describedBy, FormField } from "@/components/form-field"
import { FormAlert } from "@/components/form-alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errorMessage } from "@/lib/api/errors"
import { createOrganization } from "@/lib/api/organizations"
import type { OrganizationOut } from "@/lib/api/types"
import { organizationSchema, type OrganizationValues } from "@/lib/auth/schemas"

export function CreateOrganizationForm({
  onCreated,
}: {
  onCreated: (org: OrganizationOut) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "" },
  })

  async function onSubmit(values: OrganizationValues) {
    setFormError(null)
    try {
      const { data } = await createOrganization(values.name)
      reset()
      onCreated(data)
    } catch (error) {
      setFormError(errorMessage(error, "Could not create the organization."))
    }
  }

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-label="Create organization"
    >
      <FormAlert message={formError} />
      <FormField id="org-name" label="Organization name" error={errors.name?.message}>
        <Input
          id="org-name"
          placeholder="Acme Inc."
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("org-name", errors.name?.message)}
          {...register("name")}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating…" : "Create organization"}
      </Button>
    </form>
  )
}
