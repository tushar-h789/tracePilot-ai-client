# syntax=docker/dockerfile:1
# TracePilot web: Bun installs deps and builds; the standalone server runs on Node 24 (Next.js's
# supported runtime). Built by the server repo's docker-compose.yml (`--profile web`).

FROM oven/bun:1.3.14-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:1.3.14-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# One build worker keeps peak RAM around 0.6 GB (see next.config.ts); types are checked in CI.
ENV NEXT_BUILD_CPUS=1 \
    NEXT_SKIP_TYPECHECK=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# In this image `node` is a shim to Bun, so `next build` runs on the Bun runtime here.
RUN bun run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=root:root /app/.next/standalone ./
COPY --from=builder --chown=root:root /app/.next/static ./.next/static
COPY --from=builder --chown=root:root /app/public ./public
# The official image ships an unprivileged "node" user (uid 1000).
USER 1000:1000
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
