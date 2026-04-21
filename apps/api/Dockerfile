FROM oven/bun:1.3.9

WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/api/package.json       ./apps/api/
COPY packages/db/package.json    ./packages/db/
COPY packages/logger/package.json ./packages/logger/
COPY packages/types/package.json  ./packages/types/
COPY services/worker/package.json ./services/worker/
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/web/package.json        ./apps/web/

RUN bun install --frozen-lockfile

COPY apps/api      ./apps/api
COPY packages/db   ./packages/db
COPY packages/logger ./packages/logger
COPY packages/types  ./packages/types

EXPOSE 4000

CMD ["bun", "run", "apps/api/src/index.ts"]
