# Services Package Technical Notes

## Purpose

`packages/services` owns shared domain logic that should be reused by scripts, the public app, and the future MCP server.

## Current State

- `seed.ts` remains the shared seed import path used by repository scripts.
- `countries.ts`, `destinations.ts`, and `listings.ts` now provide the Phase 4 shared query and listing-service surface.
- The package now owns both the public read contract for the web app and the listing write contract that future MCP tools should reuse.

## Public Read Queries

- Country, region, and destination browse queries are country-scoped and sorted by title.
- Country, region, and destination detail lookups return `null` on misses so page-level callers can render clean 404 behavior.
- Region and destination listing queries return listing-card friendly data with category, region, and tag summaries already attached.
- Listing detail returns country, region, category, ordered tags, ordered gallery images, explicit destination links, coordinates, busyness rating, and optional Google Maps metadata in one call.
- Public listing reads always exclude `draft` and trashed rows.

## Listing Write Services

- `createListingDraft` creates a fully populated listing row with `status = draft`, matching the current non-null schema contract.
- `updateListingCopyAndMetadata` owns title, slug, short description, description, cover image, category, and busyness rating edits.
- `setListingLocation` owns latitude, longitude, and optional Google Maps place URL updates.
- `assignListingDestinations` is replace-all and validates that assigned destinations live in the same country as the listing.
- `setListingImages` is replace-all and recreates ordered gallery rows with fresh UUIDs, removing stale gallery rows in the same transaction.
- `publishListing`, `unpublishListing`, `trashListing`, and `restoreListing` own lifecycle transitions.

## Validation and Error Rules

- Listing slugs stay unique within a region.
- Category slugs must exist before listing writes are accepted.
- Busyness rating must stay on the editorial `1` to `5` integer scale.
- Latitude and longitude remain the source of truth for map behavior and are validated for real-world bounds.
- Trashed listings cannot be edited, published, or unpublished until restored.
- Service-layer validation errors raise `ServiceError` values with `NOT_FOUND`, `CONFLICT`, `INVALID_INPUT`, or `INVALID_STATE` codes.

## Audit and Lifecycle Semantics

- Public reads filter to `published` plus `deletedAt IS NULL` by default.
- Mutating listing services always stamp `source`, `updatedBy`, and `updatedAt`.
- Listing creation also stamps `createdBy` and `createdAt`.
- Trash and restore preserve the listing's prior publication state because soft delete is tracked only through `deletedAt`.

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
- Service writes reject invalid state transitions such as editing or publishing trashed listings.
- Service writes reject cross-country destination assignment and unknown category or parent lookups before mutating the database.

## Tests

- `services.test.ts` provisions fresh temp SQLite databases, applies migrations, imports the shared seed dataset, and exercises the public query and listing write surface end to end.
