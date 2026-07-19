FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY . .
RUN cd apps/api && pnpm exec prisma generate
RUN pnpm --filter api build

FROM base AS deploy
WORKDIR /app
COPY --from=build /app .
RUN pnpm --filter api --prod deploy --legacy /deploy

FROM node:24-alpine AS prod
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=deploy /deploy/dist ./dist
COPY --from=deploy /deploy/node_modules ./node_modules
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/prisma.config.ts ./prisma.config.ts
RUN chown -R appuser:appgroup /app
USER appuser
ENV NODE_ENV=production
EXPOSE 3000
# 127.0.0.1 (IPv4) to match the container bind and dodge any localhost→::1 quirk.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node node_modules/prisma/build/index.js generate && exec node dist/main"]
