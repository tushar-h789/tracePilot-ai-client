import type { Role } from "@/lib/api/types"

/**
 * UI hints only. The API enforces every rule (PROJECT_PLAN §5); these helpers just decide which
 * controls to show so users are not offered actions that will be refused.
 */
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

export function canManageMembers(actor: Role): boolean {
  return actor === "owner" || actor === "admin"
}

export function assignableRoles(actor: Role): Role[] {
  if (actor === "owner") return ["owner", "admin", "member", "viewer"]
  if (actor === "admin") return ["admin", "member", "viewer"]
  return []
}

export function canEditMember(actor: Role, target: Role): boolean {
  if (actor === "owner") return true
  if (actor === "admin") return target !== "owner"
  return false
}
