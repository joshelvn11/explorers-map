# Technical Notes

## Workspace Structure

This repository is organized as a pnpm workspace.

- `apps/web` contains the Next.js public application.
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
- `apps/web` is wired to resolve shared workspace packages.
- `packages/db` now owns the initial Drizzle schema, SQLite path resolution, and migration workflow.
- `packages/services` now owns the shared seed import pipeline used by repository scripts plus the shared public query and listing write services used by future app and MCP entrypoints.
- The shared database file defaults to `.data/explorers-map.sqlite` unless `EXPLORERS_MAP_SQLITE_PATH` overrides it.
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
- Public listing reads apply `status = published` and `deletedAt IS NULL` by default so callers do not need to remember lifecycle filters.
- Country, region, and destination detail lookups are included in the shared query layer so the web app can build metadata, page headers, and 404 behavior without bypassing shared services.
- Listing write services now own draft creation, copy/metadata edits, location edits, destination assignment, gallery replacement, publish/unpublish, trash, and restore behavior.
- Listing destination assignment is country-scoped, but destination-to-region membership remains editorial metadata rather than a hard validation rule.
- Gallery updates are replace-all operations that delete stale rows and recreate ordered gallery records with fresh IDs.
- Service writes update `source`, `updatedBy`, and `updatedAt` consistently, while creation also populates `createdBy`.

## Service Tests

- `pnpm test:services` runs Node-based integration tests against fresh temp SQLite databases.
- The service test suite covers public visibility filters, explicit destination linkage, listing detail hydration, audit/source stamping, slug conflicts, cross-country destination guards, gallery replacement, and lifecycle transitions.

## Notes for Future Agents

- Prefer package imports such as `@explorers-map/db` and `@explorers-map/services` over deep relative imports.
- When adding new shared modules, expose them through the relevant package manifest.
- Keep Next.js transpilation settings aligned with any shared package usage in `apps/web`.
- Keep seed data, service rules, and MCP tools aligned with the DB constraints when later phases add writes and import flows.
