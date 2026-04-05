# Explorers Map

Explorers Map is a curated discovery app for outdoor and nature-focused places.

## Repository Layout

- `apps/web`
  Next.js public app, current Actions API host, and planned home of the authenticated CMS.
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
pnpm auth:bootstrap-admin
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
- The web app now also includes Better Auth browser sessions, signed-in account pages, a protected CMS shell, Phase 9 admin tooling for users, countries, and regions, and Phase 10a destination management for admins plus region-scoped moderators.
- `pnpm dev:web` now runs `pnpm db:migrate` and the idempotent bootstrap-admin initializer before Next.js starts.
- Run `pnpm seed` before `pnpm dev:web` only when you need to populate a fresh local database with the curated development content.
- Production builds no longer require seeded SQLite content because DB-backed public routes now render dynamically against the runtime database.

## Docker Deployment

This repository now includes a web-only container deployment path for Dockhand and other Docker-based hosts.

Key behavior:

- The image builds the Next.js web app from the workspace root.
- The Compose service now sets `pull_policy: build` so `docker compose up` rebuilds the local web image instead of silently reusing a stale one.
- Container startup always runs `pnpm db:migrate`.
- The container seeds the SQLite database only when the `countries` table is empty.
- The public site renders DB-backed country, region, destination, catalog, and listing pages at request time so new content appears without rebuilding the image.
- The footer now shows a Docker-generated build marker with a source fingerprint and UTC build timestamp so deployed stacks can be visually verified after each rebuild.

Local Docker commands:

```bash
export EXPLORERS_MAP_ACTIONS_AUTH_TOKEN=change-me-actions-token
export EXPLORERS_MAP_PUBLIC_APP_URL=http://localhost:3000
export EXPLORERS_MAP_HOST_PORT=8080
docker compose up --build
```

Runtime notes:

- The compose stack mounts a named volume at `/app/data` so SQLite persists across container recreation.
- The default container database path is `/app/data/explorers-map.sqlite`.
- The web container listens on port `3000` internally, while Docker Compose maps it to `EXPLORERS_MAP_HOST_PORT` on the host, defaulting to `8080`.
- The container health check uses `GET /api/actions/healthz`.
- The compose file intentionally includes only the web app; the standalone MCP server is not containerized yet.
- Container startup now also runs the idempotent bootstrap-admin initializer after migrations and optional seeding.
- The compose stack must provide `BETTER_AUTH_SECRET` for auth-enabled production builds, and it can also pass `BETTER_AUTH_URL` plus the optional bootstrap-admin env vars into the container.

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
- `BETTER_AUTH_SECRET`
  Required secret for Better Auth browser-session signing in production.
- `BETTER_AUTH_URL`
  Base URL for Better Auth browser-session routes. Defaults locally to `http://localhost:3000`.
- `EXPLORERS_MAP_BOOTSTRAP_ADMIN_NAME`
  Display name for the one-time bootstrap admin flow.
- `EXPLORERS_MAP_BOOTSTRAP_ADMIN_EMAIL`
  Email for the one-time bootstrap admin flow.
- `EXPLORERS_MAP_BOOTSTRAP_ADMIN_PASSWORD`
  Password for the one-time bootstrap admin flow.

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
- The current Actions bearer token remains fully separate from browser/session auth.

Browser auth note:

- Browser auth in `apps/web` is for signed-in humans and is separate from MCP token auth and Actions token auth.
- Open signup now defaults new users to a non-CMS `viewer` role.
- `/account` is available to any signed-in user, while `/cms` is reserved for `admin` and region-scoped `moderator` roles.
- Phase 9 adds admin-only CMS routes for `/cms/users`, `/cms/countries`, and `/cms/regions`, plus create/edit subroutes for those records.
- Phase 10a adds shared CMS destination routes at `/cms/destinations`, `/cms/destinations/new`, and `/cms/destinations/[countrySlug]/[destinationSlug]`.
- Destination editing now supports moderator-safe partial control: moderators can create or edit only inside their managed regions, and out-of-scope existing destination links are preserved unless an admin changes them.
- `pnpm auth:bootstrap-admin` runs the explicit one-time bootstrap-admin initializer, and the same initializer also runs during `pnpm docker:start:web`.
- `pnpm dev:web` now also runs the same bootstrap-admin initializer after migrations so local auth/CMS work starts from a migrated schema.

## Source of Truth

- Product and architecture decisions live in `BRIEF.md`.
- Sequencing and delivery phases live in `IMPLEMENTATION_PLAN.md`.
- Agent-specific guardrails live in `AGENTS.md`.
