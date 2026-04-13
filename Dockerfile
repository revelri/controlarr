FROM node:22-slim AS node-build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY packages/ packages/
RUN npm ci && npx tsc --build && npm prune --production

FROM golang:1.26-trixie AS go-build
RUN git clone --depth 1 https://github.com/jaredtrent/jellyfin-mcp.git /src/jellyfin-mcp
WORKDIR /src/jellyfin-mcp
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /jellyfin-mcp .

FROM node:22-slim
RUN addgroup --system controlarr && adduser --system --ingroup controlarr controlarr
WORKDIR /app

COPY --from=node-build /app/node_modules node_modules/
COPY --from=node-build /app/packages/core/dist packages/core/dist/
COPY --from=node-build /app/packages/core/package.json packages/core/
COPY --from=node-build /app/packages/radarr/dist packages/radarr/dist/
COPY --from=node-build /app/packages/radarr/package.json packages/radarr/
COPY --from=node-build /app/packages/sonarr/dist packages/sonarr/dist/
COPY --from=node-build /app/packages/sonarr/package.json packages/sonarr/
COPY --from=node-build /app/packages/prowlarr/dist packages/prowlarr/dist/
COPY --from=node-build /app/packages/prowlarr/package.json packages/prowlarr/
COPY --from=node-build /app/packages/bazarr/dist packages/bazarr/dist/
COPY --from=node-build /app/packages/bazarr/package.json packages/bazarr/
COPY --from=node-build /app/packages/jellyseerr/dist packages/jellyseerr/dist/
COPY --from=node-build /app/packages/jellyseerr/package.json packages/jellyseerr/
COPY --from=node-build /app/packages/server/dist packages/server/dist/
COPY --from=node-build /app/packages/server/package.json packages/server/
COPY --from=node-build /app/package.json .

COPY --from=go-build /jellyfin-mcp /usr/local/bin/jellyfin-mcp
COPY vendor/jellyfin-mcp/LICENSE vendor/jellyfin-mcp/LICENSE
COPY vendor/jellyfin-mcp/ATTRIBUTION.md vendor/jellyfin-mcp/ATTRIBUTION.md

USER controlarr
ENTRYPOINT ["node", "packages/server/dist/cli.js"]
