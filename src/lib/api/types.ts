import type { components } from "./schema"

/** Convenience aliases over the generated OpenAPI types (never edit schema.d.ts by hand). */
export type Schemas = components["schemas"]
export type LivenessResponse = Schemas["LivenessResponse"]
export type ReadinessResponse = Schemas["ReadinessResponse"]
export type DependencyCheck = Schemas["DependencyCheck"]
