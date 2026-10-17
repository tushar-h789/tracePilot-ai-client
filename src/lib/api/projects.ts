import { browserApi, type BrowserRequestOptions } from "./browser"
import type {
  IngestionKeyCreated,
  IngestionKeyListResponse,
  IngestionKeyOut,
  IngestionKeyRotated,
  ProjectCreate,
  ProjectListResponse,
  ProjectOut,
  ProjectUpdate,
} from "./types"

const enc = encodeURIComponent

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== false) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ""
}

export interface ListProjectsParams {
  includeArchived?: boolean
  cursor?: string | null
  limit?: number
}

export function listProjects(
  orgId: string,
  params: ListProjectsParams = {},
  options: BrowserRequestOptions = {},
) {
  const qs = query({
    include_archived: params.includeArchived,
    cursor: params.cursor,
    limit: params.limit,
  })
  return browserApi<ProjectListResponse>(`/organizations/${enc(orgId)}/projects${qs}`, options)
}

export function createProject(
  orgId: string,
  body: ProjectCreate,
  options: BrowserRequestOptions = {},
) {
  return browserApi<ProjectOut>(`/organizations/${enc(orgId)}/projects`, {
    ...options,
    method: "POST",
    json: body,
  })
}

export function getProject(projectId: string, options: BrowserRequestOptions = {}) {
  return browserApi<ProjectOut>(`/projects/${enc(projectId)}`, options)
}

export function updateProject(
  projectId: string,
  body: ProjectUpdate,
  options: BrowserRequestOptions = {},
) {
  return browserApi<ProjectOut>(`/projects/${enc(projectId)}`, {
    ...options,
    method: "PATCH",
    json: body,
  })
}

export function setProjectArchived(
  projectId: string,
  archived: boolean,
  options: BrowserRequestOptions = {},
) {
  return browserApi<ProjectOut>(`/projects/${enc(projectId)}/${archived ? "archive" : "restore"}`, {
    ...options,
    method: "POST",
  })
}

export function listIngestionKeys(
  projectId: string,
  includeRevoked = false,
  options: BrowserRequestOptions = {},
) {
  const qs = query({ include_revoked: includeRevoked, limit: 100 })
  return browserApi<IngestionKeyListResponse>(
    `/projects/${enc(projectId)}/ingestion-keys${qs}`,
    options,
  )
}

/** Returns the plaintext key ONCE (`secret`). Callers must not persist or log it. */
export function createIngestionKey(
  projectId: string,
  name: string,
  options: BrowserRequestOptions = {},
) {
  return browserApi<IngestionKeyCreated>(`/projects/${enc(projectId)}/ingestion-keys`, {
    ...options,
    method: "POST",
    json: { name },
  })
}

export function revokeIngestionKey(
  projectId: string,
  keyId: string,
  options: BrowserRequestOptions = {},
) {
  return browserApi<IngestionKeyOut>(
    `/projects/${enc(projectId)}/ingestion-keys/${enc(keyId)}/revoke`,
    { ...options, method: "POST" },
  )
}

export function rotateIngestionKey(
  projectId: string,
  keyId: string,
  graceSeconds = 0,
  options: BrowserRequestOptions = {},
) {
  return browserApi<IngestionKeyRotated>(
    `/projects/${enc(projectId)}/ingestion-keys/${enc(keyId)}/rotate`,
    { ...options, method: "POST", json: { grace_seconds: graceSeconds } },
  )
}
