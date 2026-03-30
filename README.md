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
pnpm build:web
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
pnpm seed
```

## Environment

Copy `.env.example` to your local env file of choice and set `EXPLORERS_MAP_SQLITE_PATH` if you do not want the default repo-local SQLite file at `.data/explorers-map.sqlite`.

## Source of Truth

- Product and architecture decisions live in `BRIEF.md`.
- Sequencing and delivery phases live in `IMPLEMENTATION_PLAN.md`.
- Agent-specific guardrails live in `AGENTS.md`.
