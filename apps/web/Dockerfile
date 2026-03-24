FROM oven/bun:1

WORKDIR /repo

COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services

RUN bun install --frozen-lockfile

WORKDIR /repo/apps/web
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

