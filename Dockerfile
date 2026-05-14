FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json bun.lock* ./

# Copy all packages (needed for workspace resolution)
COPY packages/web/ ./packages/web/

# Install ALL dependencies (workspace-aware)
RUN bun install --frozen-lockfile

# Build frontend (production mode - no dev plugins)
RUN cd packages/web && bun run build

# ── Production image ──
FROM oven/bun:1.3-slim

WORKDIR /app

# Copy built frontend dist
COPY --from=builder /app/packages/web/dist ./packages/web/dist

# Copy server and its dependencies
COPY --from=builder /app/packages/web/server.ts ./packages/web/server.ts
COPY --from=builder /app/packages/web/package.json ./packages/web/package.json
COPY --from=builder /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

WORKDIR /app/packages/web

CMD ["bun", "server.ts"]
