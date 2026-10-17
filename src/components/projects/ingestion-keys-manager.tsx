"use client"

import { KeyRoundIcon } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { EmptyState } from "@/components/empty-state"
import { describedBy, FormField } from "@/components/form-field"
import { FormAlert } from "@/components/form-alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/api/errors"
import {
  createIngestionKey,
  listIngestionKeys,
  revokeIngestionKey,
  rotateIngestionKey,
} from "@/lib/api/projects"
import type { IngestionKeyOut, KeyStatus } from "@/lib/api/types"
import { keyNameSchema, type KeyNameValues } from "@/lib/auth/schemas"
import { useApiQuery } from "@/lib/use-api-query"

import { KeyRevealDialog, type RevealedKey } from "./key-reveal-dialog"

const STATUS_VARIANT: Record<KeyStatus, "default" | "secondary" | "destructive"> = {
  active: "default",
  expired: "secondary",
  revoked: "destructive",
}

export function formatWhen(iso: string | null | undefined, never = "Never"): string {
  if (!iso) return never
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? never : date.toLocaleString()
}

export function IngestionKeysManager({
  projectId,
  canManage,
  archived,
}: {
  projectId: string
  canManage: boolean
  archived: boolean
}) {
  const [includeRevoked, setIncludeRevoked] = useState(false)
  const { state, reload } = useApiQuery<IngestionKeyOut[]>(
    async () => (await listIngestionKeys(projectId, includeRevoked)).data.items,
    `${projectId}:${includeRevoked}`,
  )
  const [revealed, setRevealed] = useState<RevealedKey | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KeyNameValues>({ resolver: zodResolver(keyNameSchema), defaultValues: { name: "" } })
  const editable = canManage && !archived

  async function onCreate(values: KeyNameValues) {
    setActionError(null)
    try {
      const { data } = await createIngestionKey(projectId, values.name)
      reset()
      setRevealed({
        name: data.key.name,
        prefix: data.key.prefix,
        secret: data.secret,
        rotated: false,
      })
      reload()
    } catch (error) {
      setActionError(errorMessage(error, "Could not create the key."))
    }
  }

  async function onRevoke(key: IngestionKeyOut) {
    if (
      !window.confirm(
        `Revoke ${key.name} (${key.prefix})? Services using it will get 401 immediately. This cannot be undone.`,
      )
    ) {
      return
    }
    setActionError(null)
    setBusy(key.id)
    try {
      await revokeIngestionKey(projectId, key.id)
      reload()
    } catch (error) {
      setActionError(errorMessage(error, "Could not revoke the key."))
    } finally {
      setBusy(null)
    }
  }

  async function onRotate(key: IngestionKeyOut) {
    if (
      !window.confirm(
        `Rotate ${key.name} (${key.prefix})? A new key is issued and the current one stops working now.`,
      )
    ) {
      return
    }
    setActionError(null)
    setBusy(key.id)
    try {
      const { data } = await rotateIngestionKey(projectId, key.id, 0)
      setRevealed({
        name: data.key.name,
        prefix: data.key.prefix,
        secret: data.secret,
        rotated: true,
      })
      reload()
    } catch (error) {
      setActionError(errorMessage(error, "Could not rotate the key."))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingestion keys</CardTitle>
        <CardDescription>
          Services send logs with <code>Authorization: Bearer &lt;key&gt;</code> to{" "}
          <code>POST /api/v1/ingest/logs</code>. Only the prefix is stored in readable form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormAlert message={actionError} />
        {editable ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            noValidate
            onSubmit={handleSubmit(onCreate)}
            aria-label="Create ingestion key"
          >
            <div className="flex-1">
              <FormField id="key-name" label="Key name" error={errors.name?.message}>
                <Input
                  id="key-name"
                  placeholder="checkout-api production"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={describedBy("key-name", errors.name?.message)}
                  {...register("name")}
                />
              </FormField>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create key"}
            </Button>
          </form>
        ) : archived ? (
          <p className="text-sm text-muted-foreground">
            This project is archived. Restore it to create or rotate keys.
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeRevoked}
            onChange={(e) => setIncludeRevoked(e.target.checked)}
          />
          Show revoked and expired keys
        </label>
        {state.status === "loading" ? (
          <div aria-busy="true" aria-label="Loading keys">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : state.status === "error" ? (
          <div className="space-y-2">
            <FormAlert message={errorMessage(state.error, "Could not load the keys.")} />
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : state.data.length === 0 ? (
          <EmptyState
            icon={KeyRoundIcon}
            title="No ingestion keys"
            description={
              editable ? "Create a key to start sending logs." : "No active keys for this project."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">Ingestion keys</caption>
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Prefix
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Created
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Last used
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b last:border-0"
                    data-testid="ingestion-key-row"
                  >
                    <td className="py-2 pr-3 font-medium">{key.name}</td>
                    <td className="py-2 pr-3">
                      <code className="font-mono text-xs">{key.prefix}</code>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant={STATUS_VARIANT[key.status]}>{key.status}</Badge>
                      {key.status === "active" && key.expires_at ? (
                        <div className="text-xs text-muted-foreground">
                          expires {formatWhen(key.expires_at)}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {formatWhen(key.created_at)}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {formatWhen(key.last_used_at)}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {editable && key.status === "active" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy === key.id}
                            onClick={() => onRotate(key)}
                            aria-label={`Rotate ${key.name}`}
                          >
                            Rotate
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={busy === key.id}
                            onClick={() => onRevoke(key)}
                            aria-label={`Revoke ${key.name}`}
                          >
                            Revoke
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <KeyRevealDialog revealed={revealed} onClose={() => setRevealed(null)} />
    </Card>
  )
}
