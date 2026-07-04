FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
COPY . .
# Vite inlines VITE_API_URL into the client bundle at build time, so the public
# API origin the browser talks to has to be known here — the image is not
# environment-agnostic. web only imports api's types, so no Prisma generate.
ARG VITE_API_URL
RUN VITE_API_URL="$VITE_API_URL" pnpm --filter web build

FROM base AS deploy
WORKDIR /app
COPY --from=build /app .
RUN pnpm --filter web --prod deploy --legacy /deploy

FROM node:24-alpine AS prod
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=deploy /deploy/node_modules ./node_modules
COPY --from=build /app/apps/web/dist ./dist
COPY --from=build /app/apps/web/server.js ./server.js
RUN chown -R appuser:appgroup /app
USER appuser
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
