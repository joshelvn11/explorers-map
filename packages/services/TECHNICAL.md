# Services Package Technical Notes

## Purpose

`packages/services` owns shared domain logic that should be reused by scripts, the public app, and the future MCP server.

## Current State

- `seed.ts` is the first real shared service module in this package.
- The Phase 3 seed flow validates the editable dataset, applies lifecycle defaults, resolves slug-based relationships to DB foreign keys, and writes the full seed import in one transaction.
- The seed import path is intentionally narrow: it is shared infrastructure for scripts, not a general CRUD surface.

## Seed Sync Rules

- Countries, regions, destinations, tags, listings, and listing images preserve stable seed IDs.
- Categories upsert by `slug`.
- Seed reruns overwrite seed-managed fields on matching parent rows.
- Destination-region links, listing-destination links, listing tags, and listing images are reconciled for seeded destinations or listings so stale seeded links are removed.
- Non-seed rows are not deleted by the seed pipeline.

## Validation Coverage

- Required field presence for all seed entities
- Scoped uniqueness for region, destination, and listing slugs
- Stable ID uniqueness for entities that carry explicit IDs
- Relationship integrity across countries, regions, destinations, listings, tags, and seeded joins
- Lifecycle validation for listing status, busyness rating, optional Google Maps URLs, and optional deleted timestamps

## Failure Modes

- Duplicate scoped slugs or duplicate gallery sort order stop the import before any DB writes occur.
- Missing referenced entities stop the import before any DB writes occur.
- Invalid listing lifecycle values stop the import before any DB writes occur.
- SQLite constraint failures inside the import transaction roll back the full seed write.
