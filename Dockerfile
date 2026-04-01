FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app

# Create non-root user (Debian syntax)
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

COPY --from=build /app/build ./build
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/package.json ./
RUN bun install --frozen-lockfile --production

RUN mkdir -p /data/photos && chown -R appuser:appgroup /data/photos
USER appuser

# Health check for container orchestration
# Using wget since it's more commonly available in slim images
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

EXPOSE 3000
CMD ["bun", "run", "build/index.js"]
