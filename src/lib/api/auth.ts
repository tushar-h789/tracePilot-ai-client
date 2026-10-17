import { browserApi, type BrowserRequestOptions } from "./browser"
import type {
  LoginRequest,
  MeResponse,
  MessageResponse,
  RegisterRequest,
  SessionOut,
} from "./types"

export function register(body: RegisterRequest, options: BrowserRequestOptions = {}) {
  return browserApi<MessageResponse>("/auth/register", {
    ...options,
    method: "POST",
    json: body,
    timeoutMs: 15_000,
  })
}

export function login(body: LoginRequest, options: BrowserRequestOptions = {}) {
  return browserApi<MeResponse>("/auth/login", {
    ...options,
    method: "POST",
    json: body,
    timeoutMs: 15_000,
  })
}

export function logout(options: BrowserRequestOptions = {}) {
  return browserApi<undefined>("/auth/logout", { ...options, method: "POST" })
}

export function getMe(options: BrowserRequestOptions = {}) {
  return browserApi<MeResponse>("/auth/me", options)
}

export function listSessions(options: BrowserRequestOptions = {}) {
  return browserApi<{ items: SessionOut[] }>("/auth/sessions", options)
}
