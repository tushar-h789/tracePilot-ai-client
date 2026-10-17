/** Liveness for the web container (Docker HEALTHCHECK). Does not call the API. */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } })
}
