FROM oven/bun:1

WORKDIR /repo

COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services

RUN bun install --frozen-lockfile

WORKDIR /repo/apps/api
CMD ["bun", "run", "dev"]

