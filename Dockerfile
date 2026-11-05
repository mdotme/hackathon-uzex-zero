ARG BUN_VERSION=1.4.4

# Debian (glibc) base on purpose: @duckdb/node-api ships prebuilt glibc bindings.
FROM oven/bun:${BUN_VERSION}-debian AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
  bun install --frozen-lockfile --production

# Runtime
FROM oven/bun:${BUN_VERSION}-debian AS runtime
WORKDIR /app

ENV NODE_ENV=production \
  APP_DB_PATH=/app/.local/app.sqlite \
  DATA_DB_PATH=/app/data/data.duckdb

COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json bunfig.toml tsconfig.json ./
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun data/data.duckdb ./data/data.duckdb

RUN mkdir -p /app/.local && chown bun:bun /app/.local
VOLUME ["/app/.local"]

USER bun

CMD ["bun", "src/main.ts"]
