FROM oven/bun:1 AS deps

WORKDIR /repo

# Copy all workspace package manifests first so bun install is cached separately
# from source changes. All manifests must be present for workspace resolution.
COPY package.json bun.lock ./
COPY apps/api/package.json       ./apps/api/
COPY packages/db/package.json    ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY packages/types/package.json  ./packages/types/
# Stub unused workspace members so bun doesn't fail workspace resolution
COPY services/worker/package.json ./services/worker/
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/web/package.json        ./apps/web/

RUN bun install --frozen-lockfile --production

# ---- runner ----
FROM oven/bun:1

WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules

COPY apps/api      ./apps/api
COPY packages/db   ./packages/db
COPY packages/logger ./packages/logger
COPY packages/types  ./packages/types

EXPOSE 4000

CMD ["bun", "run", "apps/api/src/index.ts"]
