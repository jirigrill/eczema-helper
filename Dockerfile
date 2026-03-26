FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
RUN bun install --frozen-lockfile --production

RUN mkdir -p /data/photos && chown -R appuser:appgroup /data/photos
USER appuser

EXPOSE 3000
CMD ["bun", "run", "build/index.js"]
