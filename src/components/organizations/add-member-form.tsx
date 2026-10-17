"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { describedBy, FormField } from "@/components/form-field"
import { FormAlert } from "@/components/form-alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errorMessage } from "@/lib/api/errors"
import { addMember } from "@/lib/api/organizations"
import type { MemberOut, Role } from "@/lib/api/types"
import { ROLE_LABELS } from "@/lib/auth/roles"
import { addMemberSchema, type AddMemberValues } from "@/lib/auth/schemas"

export const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"

export function AddMemberForm({
  orgId,
  roles,
  onAdded,
}: {
  orgId: string
  roles: Role[]
  onAdded: (member: MemberOut) => void
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "", role: "member" },
  })

  async function onSubmit(values: AddMemberValues) {
    setFormError(null)
    try {
      const { data } = await addMember(orgId, values)
      reset()
      onAdded(data)
    } catch (error) {
      setFormError(errorMessage(error, "Could not add the member."))
    }
  }

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-label="Add member"
    >
      <FormAlert message={formError} />
      <FormField id="member-email" label="Email of a registered user" error={errors.email?.message}>
        <Input
          id="member-email"
          type="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy("member-email", errors.email?.message)}
          {...register("email")}
        />
      </FormField>
      <FormField id="member-role" label="Role" error={errors.role?.message}>
        <select id="member-role" className={SELECT_CLASS} {...register("role")}>
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add member"}
      </Button>
    </form>
  )
}
