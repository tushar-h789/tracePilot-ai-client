import { z } from "zod"

/** Mirrors the server policy (app/core/passwords.py): 12..128 chars, no composition rules. */
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Email address is too long.")
  .email("Enter a valid email address.")

export const loginSchema = z.object({
  email,
  // No length rules on login: never hint at the policy for existing accounts.
  password: z.string().min(1, "Enter your password.").max(1024, "Password is too long."),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    displayName: z.string().trim().max(100, "Display name is too long.").optional(),
    email,
    password: z
      .string()
      .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
      .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
export type RegisterValues = z.infer<typeof registerSchema>

export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter an organization name.")
    .max(100, "Use at most 100 characters."),
})
export type OrganizationValues = z.infer<typeof organizationSchema>

export const ROLES = ["owner", "admin", "member", "viewer"] as const

export const addMemberSchema = z.object({
  email,
  role: z.enum(ROLES),
})
export type AddMemberValues = z.infer<typeof addMemberSchema>

/** Mirrors app/models/project.py (SLUG_PATTERN, ENVIRONMENT_PATTERN) and ProjectCreate. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/
export const ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name.").max(100, "Use at most 100 characters."),
  slug: z
    .string()
    .trim()
    .refine((v) => v === "" || SLUG_PATTERN.test(v), {
      message: "3–48 lowercase letters, digits or hyphens; no leading or trailing hyphen.",
    }),
  environment: z
    .string()
    .trim()
    .regex(ENVIRONMENT_PATTERN, "Up to 32 lowercase letters, digits, - or _."),
  // Kept as a string in the form (HTML inputs are strings); converted with Number() on submit.
  retentionDays: z
    .string()
    .trim()
    .refine((v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 30, {
      message: "Between 1 and 30 days.",
    }),
})
export type ProjectValues = z.infer<typeof projectSchema>

export const keyNameSchema = z.object({
  name: z.string().trim().min(1, "Give the key a name.").max(100, "Use at most 100 characters."),
})
export type KeyNameValues = z.infer<typeof keyNameSchema>
