# Controlarr

MCP servers for your media stack. Manage Radarr, Sonarr, Prowlarr, Bazarr, Jellyseerr, and Jellyfin through any AI assistant that supports the [Model Context Protocol](https://modelcontextprotocol.io).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-85%20passing-brightgreen)]()
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()

---

## What it does

Controlarr exposes 77 tools across 6 services as MCP servers. Your AI assistant can search for movies, request TV shows, check download queues, manage subtitles, search indexers, and control your Jellyfin library — all through natural conversation.

**Services covered:**

| Service | Tools | What you can do |
|---------|------:|-----------------|
| [Radarr](https://radarr.video) | 18 | Search, add, edit, delete movies. Monitor queue, calendar, history. |
| [Sonarr](https://sonarr.tv) | 19 | Search, add, edit, delete series. Browse episodes, manage seasons. |
| [Prowlarr](https://prowlarr.com) | 11 | Search across indexers. Manage and test indexer configurations. |
| [Bazarr](https://www.bazarr.media) | 13 | Find and download subtitles. Track wanted lists, manage providers. |
| [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) | 16 | Search TMDB, request media, approve/decline, browse trending. |
| [Jellyfin](https://jellyfin.org) | 27+ | Browse library, control playback, manage users, admin tasks. |

Radarr through Jellyseerr are built in TypeScript. Jellyfin coverage comes from [jaredtrent/jellyfin-mcp](https://github.com/jaredtrent/jellyfin-mcp) (MIT), bundled with full attribution.

## Quick start

### Prerequisites

- **Node.js 22+** and npm
- At least one running *arr service with API access
- For Jellyfin: Go 1.25+ (to build the bundled binary)

### 1. Clone and build

```bash
git clone https://github.com/revelri/controlarr.git
cd controlarr
npm install
npm run build
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your service URLs and API keys. You only need to configure services you want to use — unconfigured services are skipped.

**Finding your API keys:**

| Service | Where to find it |
|---------|-----------------|
| Radarr | Settings > General > API Key |
| Sonarr | Settings > General > API Key |
| Prowlarr | Settings > General > API Key |
| Bazarr | Settings > General > API Key (also in `config/config.yaml` under `auth.apikey`) |
| Jellyfin | Dashboard > API Keys > Create |
| Jellyseerr | Settings > General > API Key |

### 3. Run

```bash
# Load env and start the unified server (stdio)
source .env && node packages/server/dist/cli.js
```

The server prints which services are enabled to stderr, then communicates over stdin/stdout using the MCP protocol.

## Installation

### Claude Desktop / Claude Code

Add to your MCP configuration (`claude_desktop_config.json` or `.claude/settings.json`):

```json
{
  "mcpServers": {
    "controlarr": {
      "command": "node",
      "args": ["/path/to/controlarr/packages/server/dist/cli.js"],
      "env": {
        "RADARR_URL": "http://localhost:7878",
        "RADARR_API_KEY": "your-key",
        "SONARR_URL": "http://localhost:8989",
        "SONARR_API_KEY": "your-key",
        "PROWLARR_URL": "http://localhost:9696",
        "PROWLARR_API_KEY": "your-key",
        "BAZARR_URL": "http://localhost:6767",
        "BAZARR_API_KEY": "your-key",
        "JELLYSEERR_URL": "http://localhost:5055",
        "JELLYSEERR_API_KEY": "your-key"
      }
    }
  }
}
```

Only include the services you have. The server ignores missing ones.

### Docker

```bash
docker build -t controlarr .
```

The image includes both the TypeScript server and the Jellyfin MCP binary (built from Go source). Run it with host networking to reach local services:

```bash
docker run --rm -i --network host --env-file .env controlarr
```

Or use Docker Compose:

```bash
docker compose up
```

### Standalone per-service

Each service can run as its own MCP server:

```bash
# Just Radarr
RADARR_URL=http://localhost:7878 RADARR_API_KEY=xxx node packages/radarr/dist/cli.js

# Just Sonarr
SONARR_URL=http://localhost:8989 SONARR_API_KEY=xxx node packages/sonarr/dist/cli.js
```

Available standalone servers: `controlarr-radarr`, `controlarr-sonarr`, `controlarr-prowlarr`, `controlarr-bazarr`, `controlarr-jellyseerr`.

### Jellyfin (bundled Go binary)

Jellyfin is handled by a separate Go binary. Build it locally:

```bash
./scripts/build-jellyfin-mcp.sh
```

This clones [jaredtrent/jellyfin-mcp](https://github.com/jaredtrent/jellyfin-mcp) and builds to `bin/jellyfin-mcp`. Run it alongside the main server:

```json
{
  "mcpServers": {
    "controlarr": {
      "command": "node",
      "args": ["/path/to/controlarr/packages/server/dist/cli.js"],
      "env": { "..." : "..." }
    },
    "jellyfin": {
      "command": "/path/to/controlarr/bin/jellyfin-mcp",
      "env": {
        "JELLYFIN_URL": "http://localhost:8096",
        "JELLYFIN_API_KEY": "your-key"
      }
    }
  }
}
```

The Docker image bundles both automatically.

### OpenClaw

Copy `openclaw/skill.yaml` to your OpenClaw skills directory. The skill starts both MCP servers and provides a system prompt guiding the agent through common workflows.

### MCPB (Claude Desktop bundle)

Build the bundle for one-click Claude Desktop installation:

```bash
npm run build
# Assemble and pack (see scripts/ for details)
mcpb pack mcpb/ controlarr.mcpb
```

## Configuration

### CLI flags

| Flag | Effect |
|------|--------|
| `--read-only` | Only registers read operations. No add, edit, delete, or search triggers. |
| `--disable-destructive` | Registers all tools except destructive ones (delete). |
| `--services=radarr,sonarr` | Only enables the listed services. Comma-separated. |

Flags can be combined:

```bash
node packages/server/dist/cli.js --read-only --services=radarr,sonarr
```

### Environment variables

Each service needs two variables: `{SERVICE}_URL` and `{SERVICE}_API_KEY`. See [`.env.example`](.env.example) for the full list.

Bazarr uses query parameter authentication (handled automatically). All other services use `X-Api-Key` header authentication.

## Safety

Destructive operations (delete movie, delete series, delete indexer, etc.) require a `confirm: true` parameter. Without it, the tool returns a preview of what would be deleted and asks for confirmation.

Tool annotations declare `readOnlyHint`, `destructiveHint`, and `idempotentHint` on every tool, allowing MCP clients to enforce their own safety policies.

## Architecture

```
MCP Client (Claude, etc.)
         │ stdio / JSON-RPC
         ▼
┌─────────────────────────┐
│    Unified Server       │
│  service discovery,     │
│  tool routing           │
├───┬───┬───┬───┬───┬─────┤
│ R │ S │ P │ B │ J │ JF  │
│ a │ o │ r │ a │ e │ e   │
│ d │ n │ o │ z │ l │ l   │
│ a │ a │ w │ a │ l │ l   │
│ r │ r │ l │ r │ y │ y   │
│ r │ r │ a │ r │ s │ f   │
│   │   │ r │   │ e │ i   │
│   │   │ r │   │ e │ n   │
│   │   │   │   │ r │     │
│   │   │   │   │ r │     │
└───┴───┴───┴───┴───┴─────┘
         │ HTTP + API keys
         ▼
   *arr / Jellyfin APIs
```

```
controlarr/
  packages/
    core/          Shared HTTP client, config, pagination, MCP helpers
    radarr/        Radarr MCP server (standalone capable)
    sonarr/        Sonarr MCP server (standalone capable)
    prowlarr/      Prowlarr MCP server (standalone capable)
    bazarr/        Bazarr MCP server (standalone capable)
    jellyseerr/    Jellyseerr MCP server (standalone capable)
    server/        Unified server composing all packages
  vendor/
    jellyfin-mcp/  License and attribution for bundled Go binary
  openclaw/        OpenClaw skill definition
  scripts/         Build helpers
  test/            MCP protocol integration tests
```

The monorepo uses npm workspaces and TypeScript project references. Each package compiles independently and can be published to npm as `@controlarr/{service}`.

**Core provides:**
- `ArrClient` — fetch-based HTTP client with retry, timeout, and dual auth mode (header or query param)
- `parseServiceConfig` / `parseAllConfigs` — Zod-validated env var parsing
- `createServer` / `runStdio` — MCP server factory with transport selection
- `paginate` — pagination metadata wrapper for API responses
- Tool annotation presets (`AnnotReadOnly`, `AnnotWrite`, `AnnotDestructive`)

## Testing

All tests run against real services — no mocks.

```bash
# Run all 85 tests
npm test

# Run a specific service
npx vitest run packages/radarr

# Run integration tests (MCP protocol level)
npx vitest run test/integration.test.ts
```

Tests require running services and a populated `.env`. The integration tests spawn actual MCP server processes, perform the JSON-RPC handshake, and call tools over stdio.

| Suite | Tests | What's verified |
|-------|------:|-----------------|
| Core | 21 | HTTP client, config parsing, pagination |
| Radarr | 13 | Library, search, calendar, queue, profiles |
| Sonarr | 13 | Library, episodes, search, queue, profiles |
| Prowlarr | 8 | Indexers, cross-indexer search, stats |
| Bazarr | 9 | Series, movies, wanted, providers, history |
| Jellyseerr | 11 | Search, trending, requests, users, issues |
| Integration | 10 | Full MCP protocol, flag filtering, standalone servers, Jellyfin binary |

## Design Rationale

| Decision | Reasoning |
|----------|-----------|
| Monorepo with standalone packages | Each service compiles and runs independently, but the unified server composes them with zero duplication |
| Real services over mocks | Mocked tests can't catch API drift — all 85 tests hit real services for true integration confidence |
| Tool annotations | `readOnlyHint`, `destructiveHint`, `idempotentHint` let MCP clients enforce their own safety policies without server-side guessing |
| confirm: true gate | Destructive operations preview what they'll delete and require explicit confirmation — impossible to accidentally drop a movie |
| Bundled Go binary for Jellyfin | Best available Jellyfin MCP server is in Go — polyglot bundling beats rewriting, with full MIT attribution |
| Zod-validated env config | Config errors surface at startup with clear messages, not as runtime 500s buried in tool calls |

## Acknowledgements

- [jaredtrent/jellyfin-mcp](https://github.com/jaredtrent/jellyfin-mcp) — Jellyfin MCP server (MIT). Bundled with attribution in `vendor/jellyfin-mcp/`.
- [Anthropic MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) — The protocol and TypeScript SDK.
- The *arr ecosystem — Radarr, Sonarr, Prowlarr, Bazarr teams for building excellent APIs.
- [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) and [Jellyfin](https://github.com/jellyfin/jellyfin) teams.

## License

[MIT](LICENSE)
