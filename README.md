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
pnpm typecheck:mcp
pnpm test:services
pnpm test:mcp
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

- The public Next.js app now reads countries, regions, destinations, and listings directly from the shared SQLite database during page rendering and static param generation.
- Run `pnpm db:migrate` and `pnpm seed` before `pnpm dev:web` or `pnpm build:web` so the public routes have data available.

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

MCP runtime note:

- `pnpm dev:mcp` and `pnpm --filter @explorers-map/mcp start` automatically load the repo-root `.env` file when it exists.
- Run `pnpm dev:mcp` after setting `EXPLORERS_MAP_MCP_AUTH_TOKEN` in `.env` or in your shell environment.
- The server listens on `/mcp` and exposes `GET /healthz`.
- All MCP requests must send `Authorization: Bearer <token>`.

## Source of Truth

- Product and architecture decisions live in `BRIEF.md`.
- Sequencing and delivery phases live in `IMPLEMENTATION_PLAN.md`.
- Agent-specific guardrails live in `AGENTS.md`.
