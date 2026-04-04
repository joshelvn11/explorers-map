# Technical Notes

## Workspace Structure

This repository is organized as a pnpm workspace.

- `apps/web` contains the Next.js public application.
- `apps/web` now also hosts the authenticated custom GPT Actions HTTP surface under `/api/actions`.
- `apps/mcp` contains the standalone MCP server.
- `packages/db` is intended to own SQLite and Drizzle concerns.
- `packages/services` is intended to own shared read/write domain logic.
- `packages/utils` is intended to own shared helpers.

## Shared Package Intent

The architectural goal is to keep business rules centralized in shared packages rather than duplicating logic across runtime entrypoints.

Expected flow:

1. `apps/web` imports shared read/query logic from workspace packages.
2. `apps/mcp` imports shared write/service logic from workspace packages.
3. Both runtime entrypoints depend on the same schema and domain rules.

## Current State

- The workspace root is configured.
- `apps/web` now renders the public MVP route tree for countries, regions, destinations, region catalogs, and canonical listing detail pages.
- `packages/db` now owns the initial Drizzle schema, SQLite path resolution, and migration workflow.
- `packages/services` now owns the shared seed import pipeline used by repository scripts plus the shared public query and listing write services used by future app and MCP entrypoints.
- `apps/web` now also serves a narrow machine-facing Actions API for custom GPT integrations, backed by the same shared service layer as the public app and MCP runtime.
- `apps/web` now also owns Better Auth browser-session handling, signed-in account routes, an idempotent bootstrap-admin initializer, and a protected CMS shell.
- The shared database file defaults to `.data/explorers-map.sqlite` unless `EXPLORERS_MAP_SQLITE_PATH` overrides it.
- Docker deployment now also supports a persistent runtime DB at `/app/data/explorers-map.sqlite` via container environment configuration.
- Core data integrity for listings, scoped slugs, and join-table duplication is enforced in the schema layer.

## Seed Pipeline

- `seed-data/index.mjs` remains the editable seed source of truth.
- `packages/services/seed.ts` validates the seed source, normalizes listing lifecycle defaults, resolves slug-based relationships to FK IDs, and imports the dataset inside one transaction.
- `scripts/seed.ts` is the CLI entrypoint for validation-only and validate-plus-import flows.
- `scripts/seed-smoke.ts` verifies the Phase 3 contract on a fresh temp SQLite database by running migrations, seeding twice, and checking representative records.

## Seed Import Semantics

- Phase 3 intentionally brings forward a narrow shared seed-import service so repository scripts already follow the brief's single shared write-path direction.
- Seeded parent rows upsert by stable primary key, overwriting seed-managed fields on rerun.
- Seed-managed joins and gallery rows are fully reconciled for seeded destinations and listings so stale seed relationships are removed on rerun.
- Rows not represented by the current seed source are left alone, which keeps non-seed content outside the seed sync path.

## Shared Service Layer

- Public read queries now live in `packages/services` for countries, country-scoped regions, country-scoped destinations, region listings, destination listings, and listing detail.
- Region catalog filtering for the public app now also lives in `packages/services`, including normalized single-value category, tag, destination, and busyness filters plus stable facets derived from all public listings in the region.
- Public listing reads apply `status = published` and `deletedAt IS NULL` by default so callers do not need to remember lifecycle filters.
- Country, region, and destination detail lookups are included in the shared query layer so the web app can build metadata, page headers, and 404 behavior without bypassing shared services.
- Listing write services now own draft creation, copy/metadata edits, location edits, destination assignment, gallery replacement, publish/unpublish, trash, and restore behavior.
- Listing destination assignment is country-scoped, but destination-to-region membership remains editorial metadata rather than a hard validation rule.
- Gallery updates are replace-all operations that delete stale rows and recreate ordered gallery records with fresh IDs.
- Service writes update `source`, `updatedBy`, and `updatedAt` consistently, while creation also populates `createdBy`.
- The shared service layer now includes browser-auth actor context, CMS role lookup, moderator-region scope lookup, and CMS write-context helpers so later CMS work can reuse one authorization path.

## CMS/Auth Direction

- `apps/web` now uses Better Auth for signed-in humans with email/password auth, session cookies, and `/api/auth/[...all]` route handling.
- Browser auth lives alongside the public web app and remains fully separate from the existing bearer-token auth used by MCP and the Actions API.
- Open signup is now live, and new users default to a `viewer` role with no CMS access.
- Current CMS roles are:
  - `admin` for full CMS and user-management access
  - `moderator` for region-scoped editorial access
  - `viewer` for authenticated non-CMS accounts
- Moderator scope is region-based and may span more than one region once assignments are managed in the CMS.
- The first root admin account now uses a one-time environment-backed bootstrap flow rather than a permanent alternate login path.
- Bootstrap-admin behavior is idempotent, runs only from explicit init paths, and does not rewrite existing admins after initialization.
- Better Auth owns auth/session/account persistence, while app-owned tables carry CMS roles and moderator-region assignments.
- Public anonymous browsing remains unaffected while `/account` and `/cms` are protected behind browser-session auth.
- The auth layer now distinguishes production build time from production runtime so Docker images can be built without baking in `BETTER_AUTH_SECRET`, while the running production container still requires the real secret.

## MCP Direction

- The initial MCP use case is personal editorial assistance through ChatGPT rather than broad external automation.
- `apps/mcp` now implements a remote stateless Streamable HTTP MCP server on `/mcp` plus `GET /healthz`.
- The runtime uses bearer-token auth first via `EXPLORERS_MAP_MCP_AUTH_TOKEN`; OAuth remains the later Phase 12 upgrade path.
- MCP favors task-shaped editorial tools over generic CRUD.
- Region, destination, and listing reads support fuzzy matching so existing records can be found even when names vary slightly.
- Fuzzy matching stops on ambiguity by returning candidate matches rather than guessing or auto-creating a nearby duplicate.
- Region and destination creation are exposed through explicit task-shaped tools such as `ensure_region`, `create_region`, `ensure_destination`, and `create_destination`.
- Destination-region assignment is explicit so a destination can be curated across one or more regions without blurring region ownership of listings.
- Listing creation follows the same duplicate-safe lookup-before-create pattern via `find_listing`, `ensure_listing`, and `create_listing_draft`.
- MCP write operations prefer lookup-and-improve flows before creating new rows.
- MCP creation workflows are evidence-first. If a new fact cannot be grounded confidently, the assistant should return no-op guidance instead of inventing data.
- New MCP-created listings default to `draft` unless the caller explicitly invokes publish behavior.
- MCP does not support sparse or placeholder-only listing drafts in MVP because the existing listing schema requires a complete draft row.
- The MCP surface exposes lightweight context resources backed by `BRIEF.md`, `TECHNICAL.md`, and `CHATGPT_MCP_CONTEXT.md`.
- `CHATGPT_MCP_CONTEXT.md` remains the root-level human-authored context document intended to guide ChatGPT usage of the Explorers Map MCP.
- `apps/mcp/API.md` now documents the implemented Phase 6 tool schemas, result shapes, auth behavior, and editorial workflows.

## Actions API Direction

- The web app now exposes `GET /api/actions/openapi.json`, `GET /api/actions/healthz`, and the Phase 7 `/api/actions/v1/...` editorial HTTP endpoints for custom GPT Actions use.
- Actions auth uses a separate bearer token via `EXPLORERS_MAP_ACTIONS_AUTH_TOKEN`.
- The Actions surface is intentionally narrow: create, list, search, and get only for countries, categories, regions, destinations, and listings.
- All Actions writes reuse existing shared `ensure_*` and listing draft creation services so duplicate protection, evidence validation, and draft-first behavior stay consistent with MCP.
- Actions listing reads include drafts by default but exclude trashed listings unless future work expands that surface explicitly.
- The checked-in OpenAPI document lives at `apps/web/openapi/explorers-map-actions.openapi.json`, and the runtime serves the same contract from `/api/actions/openapi.json`.
- A second checked-in GPT-facing production schema lives at `apps/web/openapi/explorers-map-actions.production.openapi.json`, and the runtime serves it from `/api/actions/openapi.production.json`.
- Future schema changes must update both schema files so the general runtime contract and the trimmed ChatGPT import contract do not drift.
- `CHATGPT_ACTIONS_CONTEXT.md` is the root-level GPT instruction document for this HTTP surface.

## Service Tests

- `pnpm test:services` runs Node-based integration tests against fresh temp SQLite databases.
- The service test suite covers public visibility filters, explicit destination linkage, region catalog filters and facets, listing detail hydration, audit/source stamping, slug conflicts, cross-country destination guards, gallery replacement, and lifecycle transitions.
- The editorial service suite also covers evidence-gated region/destination/listing creation, editor-visible listing reads, fuzzy matching, and ensure-flow duplicate protection.

## MCP Runtime

- `pnpm dev:mcp` starts the MCP server from `apps/mcp/server.ts`.
- The MCP runtime creates a fresh `McpServer` and stateless `StreamableHTTPServerTransport` per request so there is no shared session state to coordinate.
- All tool handlers delegate to shared services and convert domain errors into structured MCP tool errors.
- Unauthenticated `/mcp` requests are rejected at the HTTP layer before the transport runs.
- The MCP test suite covers auth rejection, resource discovery, resource reads, candidate-match behavior, insufficient-evidence handling, and duplicate-protection error responses.

## Public Web App MVP

- The public app uses App Router server components backed directly by shared query modules, and it now also hosts a narrow authenticated Actions API surface for custom GPT integrations.
- Session-based browser auth, signed-in account flows, and the first protected CMS route family now live inside `apps/web`.
- Region overview pages remain lighter browse surfaces, now previewing both published listings and linked destinations, while `/countries/[countrySlug]/regions/[regionSlug]/listings` remains the only interactive catalog route in MVP and `/countries/[countrySlug]/regions/[regionSlug]/destinations` provides the full region-linked destination index.
- Destination pages remain curated and unfiltered, showing only listings explicitly linked to that destination while linking onward to canonical region-scoped listing pages.
- Listing metadata prefers `googleMapsPlaceUrl` when present and otherwise falls back to generated Google Maps coordinate-search URLs.
- The web app no longer depends on remote Google font fetches during build; typography uses local font stacks so offline or restricted-network builds can still succeed.
- DB-backed public pages now opt into dynamic rendering so published content is read from the live runtime SQLite database instead of being baked into the build output.
- The Actions API is implemented as thin route handlers that authenticate, validate HTTP inputs, map service errors to JSON responses, and then delegate all domain logic to `packages/services`.
- The CMS shell follows the same architectural rule by keeping web auth/session handling in the app layer while delegating role lookup and CMS authorization primitives to shared services.
- The web app dev, build, and start scripts now auto-load the repo-root `.env` file so local Actions API auth behaves like the MCP runtime.
- The web app dev startup now also runs the shared migration flow and bootstrap-admin initializer before launching Next.js, which keeps existing local SQLite files compatible after schema changes such as Phase 8 auth tables.
- The Actions routes export direct segment-config literals (`runtime = "nodejs"` and `dynamic = "force-dynamic"`) because Next.js 16 build analysis rejects indirection there.
- The auth route tree now includes `/api/auth/[...all]`, `/sign-in`, `/sign-up`, `/sign-out`, `/account`, and `/cms`.
- `proxy.ts` performs optimistic cookie-based redirects for `/account` and `/cms`, while the protected pages and layouts still do authoritative server-side session and role checks.
- The browser-auth tests cover signup, signin, signout, viewer-default role creation, proxy protection, bootstrap-admin idempotency, and the separation between browser sessions and Actions bearer auth.

## Docker Deployment

- The repository root now contains a web-only `Dockerfile`, `.dockerignore`, and `docker-compose.yml`.
- The container image is built from the workspace root so existing monorepo-relative scripts and package resolution continue to work.
- Container startup runs `pnpm db:migrate`, checks whether the `countries` table is empty, seeds only on first boot, and then starts the Next.js web server.
- Container startup also runs the explicit bootstrap-admin initializer after migrations and optional seeding.
- Docker Compose persists SQLite state in a named volume mounted at `/app/data`.
- Docker Compose maps the internal web port `3000` to a configurable host port via `EXPLORERS_MAP_HOST_PORT`, defaulting to `8080`.
- The web container health check targets `GET /api/actions/healthz`.
- The compose stack now passes Better Auth env vars through to the container as well, because the auth-enabled production app requires `BETTER_AUTH_SECRET` at runtime and may optionally consume bootstrap-admin credentials during startup.
- The standalone MCP server is intentionally excluded from the compose stack for now.

## Notes for Future Agents

- Prefer package imports such as `@explorers-map/db` and `@explorers-map/services` over deep relative imports.
- When adding new shared modules, expose them through the relevant package manifest.
- Keep Next.js transpilation settings aligned with any shared package usage in `apps/web`.
- Keep seed data, service rules, and MCP tools aligned with the DB constraints when later phases add writes and import flows.
