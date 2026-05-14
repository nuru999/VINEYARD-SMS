FROM oven/bun:1.1 AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json bun.lock* ./

# Copy the web package
COPY packages/web/ ./packages/web/

# Install ALL dependencies (workspace-aware)
RUN bun install

# Build frontend
RUN cd packages/web && bun run build

# ── Production image ──
FROM oven/bun:1.1-slim

WORKDIR /app/packages/web

# Copy everything needed to run the server
COPY --from=builder /app/packages/web/dist ./dist
COPY --from=builder /app/packages/web/src ./src
COPY --from=builder /app/packages/web/server.ts ./server.ts
COPY --from=builder /app/packages/web/package.json ./package.json
COPY --from=builder /app/packages/web/node_modules ./node_modules
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 3000

CMD ["bun", "server.ts"]
