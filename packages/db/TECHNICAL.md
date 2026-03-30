# DB Package Technical Notes

## Purpose

`packages/db` owns the shared SQLite path resolution, Drizzle schema, and migration output for the workspace.

## Current Responsibilities

- Define the MVP relational schema for countries, regions, destinations, listings, tags, categories, images, and join tables
- Export a shared Drizzle client for Node-based consumers
- Keep migration files in sync with the schema
- Provide a stable path contract for the local SQLite database

## Data Model Notes

- Countries, regions, destinations, listings, and tags use text primary keys so seed data can preserve stable IDs.
- Categories are modeled as a real table keyed by `slug`, matching the existing seed data shape.
- Listing slugs are unique within a region, while region and destination slugs are unique within a country.
- Listing images include `sortOrder` so later reordering work does not require a migration.
- Soft delete is represented by nullable `deletedAt`. Query-layer behavior stays outside this package.

## Runtime Notes

- `EXPLORERS_MAP_SQLITE_PATH` is the source of truth for the database file location.
- If the env var is unset, the DB client falls back to `.data/explorers-map.sqlite` at the workspace root.
- The shared client enables SQLite foreign keys on connection creation.

## Failure Modes

- Invalid status values and out-of-range busyness ratings are rejected by DB constraints.
- Scoped slug collisions are rejected by unique indexes.
- Join-table duplicates are rejected by composite primary keys.
- Foreign-key failures surface when parent records are missing.
