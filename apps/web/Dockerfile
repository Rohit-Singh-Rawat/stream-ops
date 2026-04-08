FROM oven/bun:1 AS deps

WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/web/package.json       ./apps/web/
COPY packages/types/package.json ./packages/types/
# Stub unused workspace members so bun doesn't fail workspace resolution
COPY packages/db/package.json     ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY services/worker/package.json ./services/worker/
COPY apps/api/package.json        ./apps/api/
COPY apps/orchestrator/package.json ./apps/orchestrator/

RUN bun install --frozen-lockfile

# ---- builder ----
FROM deps AS builder

COPY apps/web    ./apps/web
COPY packages/types ./packages/types

# NEXT_PUBLIC_* vars are inlined at build time by Next.js.
# Pass the real API/asset URLs as build args via CDK DockerImageAsset buildArgs.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_ASSET_BASE_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_ASSET_BASE_URL=$NEXT_PUBLIC_ASSET_BASE_URL

WORKDIR /repo/apps/web
RUN bun run build

# ---- runner ----
FROM oven/bun:1

WORKDIR /repo

ENV NODE_ENV=production

COPY --from=deps    /repo/node_modules        ./node_modules
COPY --from=builder /repo/apps/web/.next      ./apps/web/.next
COPY --from=builder /repo/apps/web/package.json ./apps/web/package.json

WORKDIR /repo/apps/web

EXPOSE 3000

CMD ["bun", "run", "start"]
