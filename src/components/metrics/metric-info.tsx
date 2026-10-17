"use client"

import { InfoIcon } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { METRIC_DEFINITIONS, METRICS_DOC_URL, type MetricKey } from "@/lib/metric-docs"

/** Definition tooltip (keyboard focusable) plus a link to the full definition in the docs. */
export function MetricInfo({ metric, label }: { metric: MetricKey; label: string }) {
  const text = METRIC_DEFINITIONS[metric]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={`${METRICS_DOC_URL}#2-definitions`}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`How ${label} is calculated: ${text} Opens the metric documentation.`}
            className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <InfoIcon aria-hidden="true" className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
