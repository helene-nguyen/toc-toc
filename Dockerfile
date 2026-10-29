# syntax=docker/dockerfile:1
#~ One image for the Pi: build the web app and the API, then ship the API
# with its production dependencies only. The API serves the web app itself
# (WEB_DIR), so the phone talks to a single origin.

FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
# dependencies first: this layer is reused as long as no package.json changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @toc-toc/web build \
 && pnpm --filter @toc-toc/api build \
 && pnpm --filter @toc-toc/api deploy --prod /out

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=4210 \
    WEB_DIR=/app/web \
    RUN_MIGRATIONS=true
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /repo/apps/web/dist ./web
USER node
EXPOSE 4210
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4210/health || exit 1
CMD ["node", "dist/index.js"]
