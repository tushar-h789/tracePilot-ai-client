"use client"

import { CheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export interface RevealedKey {
  name: string
  prefix: string
  secret: string
  rotated: boolean
}

/**
 * Shows a newly issued ingestion key exactly once. The secret lives only in the parent's React
 * state and is dropped when the dialog closes; it is never written to storage, the URL or logs.
 */
export function KeyRevealDialog({
  revealed,
  onClose,
}: {
  revealed: RevealedKey | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null)

  async function copy() {
    if (!revealed) return
    try {
      await navigator.clipboard.writeText(revealed.secret)
      setCopied("ok")
    } catch {
      setCopied("failed")
    }
  }

  return (
    <Dialog
      open={revealed !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(null)
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{revealed?.rotated ? "Key rotated" : "Ingestion key created"}</DialogTitle>
          <DialogDescription>
            {revealed ? `${revealed.name} · ${revealed.prefix}` : null}
          </DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertDescription>
            Copy this key now. It is shown only once and cannot be retrieved later. Store it in a
            secret manager or environment variable (TRACEPILOT_INGEST_KEY). Never commit it.
          </AlertDescription>
        </Alert>
        <div className="space-y-1.5">
          <Label htmlFor="revealed-key">Ingestion key</Label>
          <div className="flex gap-2">
            <input
              id="revealed-key"
              readOnly
              value={revealed?.secret ?? ""}
              autoComplete="off"
              spellCheck={false}
              onFocus={(e) => e.currentTarget.select()}
              className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-muted px-2 font-mono text-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              {copied === "ok" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
              {copied === "ok" ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {copied === "failed" ? "Copy failed. Select the key and copy it manually." : null}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              setCopied(null)
              onClose()
            }}
          >
            I have saved the key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
