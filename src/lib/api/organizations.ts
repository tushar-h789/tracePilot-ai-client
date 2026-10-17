import { browserApi, type BrowserRequestOptions } from "./browser"
import type {
  MemberListResponse,
  MemberOut,
  OrganizationListResponse,
  OrganizationOut,
  Role,
} from "./types"

const enc = encodeURIComponent

export function listOrganizations(options: BrowserRequestOptions = {}) {
  return browserApi<OrganizationListResponse>("/organizations", options)
}

export function createOrganization(name: string, options: BrowserRequestOptions = {}) {
  return browserApi<OrganizationOut>("/organizations", {
    ...options,
    method: "POST",
    json: { name },
  })
}

export function getOrganization(orgId: string, options: BrowserRequestOptions = {}) {
  return browserApi<OrganizationOut>(`/organizations/${enc(orgId)}`, options)
}

export function listMembers(orgId: string, options: BrowserRequestOptions = {}) {
  return browserApi<MemberListResponse>(`/organizations/${enc(orgId)}/members`, options)
}

export function addMember(
  orgId: string,
  body: { email: string; role: Role },
  options: BrowserRequestOptions = {},
) {
  return browserApi<MemberOut>(`/organizations/${enc(orgId)}/members`, {
    ...options,
    method: "POST",
    json: body,
  })
}

export function changeMemberRole(
  orgId: string,
  userId: string,
  role: Role,
  options: BrowserRequestOptions = {},
) {
  return browserApi<MemberOut>(`/organizations/${enc(orgId)}/members/${enc(userId)}`, {
    ...options,
    method: "PATCH",
    json: { role },
  })
}

export function removeMember(orgId: string, userId: string, options: BrowserRequestOptions = {}) {
  return browserApi<undefined>(`/organizations/${enc(orgId)}/members/${enc(userId)}`, {
    ...options,
    method: "DELETE",
  })
}

export function renameOrganization(
  orgId: string,
  name: string,
  options: BrowserRequestOptions = {},
) {
  return browserApi<OrganizationOut>(`/organizations/${enc(orgId)}`, {
    ...options,
    method: "PATCH",
    json: { name },
  })
}
