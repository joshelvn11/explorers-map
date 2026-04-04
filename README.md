# Explorers Map

Explorers Map is a curated discovery app for outdoor and nature-focused places.

## Repository Layout

- `apps/web`
  Next.js public app.
- `apps/mcp`
  Standalone MCP server for machine-driven content operations.
- `packages/db`
  Shared Drizzle schema, SQLite client, and migrations.
- `packages/services`
  Shared domain logic used by both the web app and MCP server.
- `packages/utils`
  Shared helpers.
- `seed-data`
  Early curated content and seed validation data.
- `scripts`
  Repository-level scripts.

## Workspace

This repository uses a pnpm workspace rooted at the repository root.

Common commands:

```bash
pnpm dev:web
pnpm dev:mcp
pnpm build:web
pnpm lint
pnpm typecheck
pnpm test:web
pnpm typecheck:mcp
pnpm test:services
pnpm test:mcp
pnpm docker:start:web
pnpm db:generate
pnpm db:migrate
pnpm studio
pnpm seed:validate
pnpm seed
pnpm seed:smoke
```

Seed command behavior:

- `pnpm seed:validate`
  Validates the editable seed source and prints counts and warnings without writing to the database.
- `pnpm seed`
  Validates the seed source, writes `seed-data/generated/seed.snapshot.json`, and imports the normalized dataset into SQLite.
- `pnpm seed:smoke`
  Creates a fresh temp SQLite database, runs migrations, seeds twice, and verifies idempotent counts plus representative seeded records.
- `pnpm test:services`
  Runs the shared service-layer Node test suite against fresh temp SQLite databases seeded with the curated development dataset.

Public app note:

- The public Next.js app now reads countries, regions, destinations, and listings directly from the shared SQLite database during page rendering.
- Run `pnpm db:migrate` and `pnpm seed` before `pnpm dev:web` so the public routes have data available.
- Production builds no longer require seeded SQLite content because DB-backed public routes now render dynamically against the runtime database.

## Docker Deployment

This repository now includes a web-only container deployment path for Dockhand and other Docker-based hosts.

Key behavior:

- The image builds the Next.js web app from the workspace root.
- Container startup always runs `pnpm db:migrate`.
- The container seeds the SQLite database only when the `countries` table is empty.
- The public site renders DB-backed country, region, destination, catalog, and listing pages at request time so new content appears without rebuilding the image.

Local Docker commands:

```bash
export EXPLORERS_MAP_ACTIONS_AUTH_TOKEN=change-me-actions-token
export EXPLORERS_MAP_PUBLIC_APP_URL=http://localhost:3000
docker compose up --build
```

Runtime notes:

- The compose stack mounts a named volume at `/app/data` so SQLite persists across container recreation.
- The default container database path is `/app/data/explorers-map.sqlite`.
- The container health check uses `GET /api/actions/healthz`.
- The compose file intentionally includes only the web app; the standalone MCP server is not containerized yet.

## Environment

Copy `.env.example` to your local env file of choice and set `EXPLORERS_MAP_SQLITE_PATH` if you do not want the default repo-local SQLite file at `.data/explorers-map.sqlite`.

- `EXPLORERS_MAP_PUBLIC_APP_URL`
  Optional origin used as the metadata base for the public web app. Defaults to `http://localhost:3000`.
- `EXPLORERS_MAP_MCP_HOST`
  Optional bind host for the MCP server. Defaults to `127.0.0.1`.
- `EXPLORERS_MAP_MCP_PORT`
  Optional bind port for the MCP server. Defaults to `3001`.
- `EXPLORERS_MAP_MCP_AUTH_TOKEN`
  Required bearer token for the MCP server.
- `EXPLORERS_MAP_ACTIONS_AUTH_TOKEN`
  Required bearer token for the custom GPT Actions HTTP API under `apps/web`.

Container deployment note:

- Docker Compose provides `EXPLORERS_MAP_SQLITE_PATH`, `EXPLORERS_MAP_PUBLIC_APP_URL`, and `EXPLORERS_MAP_ACTIONS_AUTH_TOKEN` through the container environment, so a repo-local `.env` file is optional for containerized deployment.

MCP runtime note:

- `pnpm dev:mcp` and `pnpm --filter @explorers-map/mcp start` automatically load the repo-root `.env` file when it exists.
- Run `pnpm dev:mcp` after setting `EXPLORERS_MAP_MCP_AUTH_TOKEN` in `.env` or in your shell environment.
- The server listens on `/mcp` and exposes `GET /healthz`.
- All MCP requests must send `Authorization: Bearer <token>`.

Actions API note:

- `apps/web` now also hosts a narrow authenticated HTTP API for custom GPT Actions under `/api/actions`.
- The checked-in OpenAPI contract lives at `apps/web/openapi/explorers-map-actions.openapi.json`.
- The production GPT import contract lives at `apps/web/openapi/explorers-map-actions.production.openapi.json`.
- The runtime serves the same contract from `GET /api/actions/openapi.json`.
- The trimmed production GPT import contract is also served from `GET /api/actions/openapi.production.json`.
- `pnpm dev:web`, `pnpm build:web`, and `pnpm --filter @explorers-map/web start` now automatically load the repo-root `.env` file when it exists.
- The primary custom GPT workflow is list/search/get before create so duplicate-safe ensure flows can stop on ambiguity instead of inventing new records.

## Source of Truth

- Product and architecture decisions live in `BRIEF.md`.
- Sequencing and delivery phases live in `IMPLEMENTATION_PLAN.md`.
- Agent-specific guardrails live in `AGENTS.md`.
