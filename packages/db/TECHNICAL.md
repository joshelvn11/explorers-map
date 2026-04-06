# DB Package Technical Notes

## Purpose

`packages/db` owns the shared SQLite path resolution, Drizzle schema, and migration output for the workspace.

## Current Responsibilities

- Define the MVP relational schema for countries, regions, destinations, listings, tags, categories, images, and join tables
- Define Better Auth-owned `user`, `session`, `account`, `verification`, and `rate_limit` tables
- Define app-owned `cms_user_roles` and `moderator_region_assignments` tables
- Export a shared Drizzle client for Node-based consumers
- Keep migration files in sync with the schema
- Provide a stable path contract for the local SQLite database
- Support the browser CMS rollout in the same SQLite database

## Data Model Notes

- Countries, regions, destinations, listings, and tags use text primary keys so seed data can preserve stable IDs.
- Categories are modeled as a real table keyed by `slug`, matching the existing seed data shape.
- Listing slugs are unique within a region, while region and destination slugs are unique within a country.
- Listing images include `sortOrder` so later reordering work does not require a migration.
- Destinations now allow `coverImage = null` so ChatGPT and MCP can create best-effort destination records before media is curated.
- Listings now allow nullable `latitude`, `longitude`, `busynessRating`, `coverImage`, and `categorySlug` so machine-assisted flows can create sparse drafts while keeping editorial copy required.
- Soft delete is represented by nullable `deletedAt`. Query-layer behavior stays outside this package.
- Better Auth should own the auth/session/account tables, while app-owned schema additions should carry CMS role data and moderator-region assignments.
- Phase 9 extends those app-owned CMS tables with nullable actor-attribution columns for admin-managed role changes and moderator-region assignments.
- `rate_limit` now uses a generated Better Auth `id` plus a unique `key`, which lets Better Auth keep database-backed rate limiting in SQLite without bypassing the shared migration flow.
- Phase 10a now extends content audit tracking to destinations via nullable `created_by` and `updated_by` foreign keys, while countries and regions still remain unaudited for now.

## Runtime Notes

- `EXPLORERS_MAP_SQLITE_PATH` is the source of truth for the database file location.
- If the env var is unset, the DB client falls back to `.data/explorers-map.sqlite` at the workspace root.
- The shared client enables SQLite foreign keys on connection creation.

## Failure Modes

- Invalid status values and out-of-range busyness ratings are rejected by DB constraints.
- Scoped slug collisions are rejected by unique indexes.
- Join-table duplicates are rejected by composite primary keys.
- Foreign-key failures surface when parent records are missing.
- Better Auth runtime assumptions still depend on the auth tables matching the generated schema shape, especially the `rate_limit` model and the snake_case timestamp columns.
