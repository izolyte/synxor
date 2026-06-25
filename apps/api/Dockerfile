FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
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
RUN chown -R appuser:appgroup /app
USER appuser
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main"]
