import { TerminalIcon } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

/** Empty-state guidance: how to get logs in with the SDK or the demo CLI. */
export function IngestGuidance({ settingsHref }: { settingsHref?: string }) {
  return (
    <div className="space-y-3 text-left text-sm">
      <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
        <li>
          Create an ingestion key in{" "}
          {settingsHref ? (
            <Link
              href={settingsHref}
              className="font-medium text-foreground underline underline-offset-4"
            >
              project settings
            </Link>
          ) : (
            "project settings"
          )}{" "}
          (it is shown once).
        </li>
        <li>
          Send synthetic logs with the demo CLI from the server repository:
          <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs text-foreground">
            {`export TRACEPILOT_INGEST_KEY=<your key>
uv run --project demo/sample-service tracepilot-demo --scenario http-500 --count 200`}
          </pre>
        </li>
        <li>
          Or from your app with the Python SDK:
          <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs text-foreground">
            {`from tracepilot_sdk import LogEvent, TracePilotClient

with TracePilotClient(endpoint="http://localhost:8000") as client:  # key from env
    client.send([LogEvent(level="error", service_name="checkout",
                          message="payment failed", http_status=500)])`}
          </pre>
        </li>
      </ol>
      {settingsHref ? (
        <Link href={settingsHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <TerminalIcon aria-hidden="true" />
          Manage ingestion keys
        </Link>
      ) : null}
    </div>
  )
}
