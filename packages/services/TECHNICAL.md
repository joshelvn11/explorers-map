# Services Package Technical Notes

## Purpose

`packages/services` owns shared domain logic that should be reused by scripts, the public app, and the future MCP server.

## Current State

- `seed.ts` remains the shared seed import path used by repository scripts.
- `countries.ts`, `destinations.ts`, and `listings.ts` now provide the Phase 4 shared query and listing-service surface.
- `editorial.ts` now provides the MCP-facing editorial read, matching, ensure, and safe-creation surface.
- `auth.ts` now provides shared CMS role lookup, actor-context assembly, moderator-region scope lookup, admin detection, and CMS write-context helpers.
- `cms.ts` now provides Phase 9 admin CMS operations for users, countries, and regions.
- The package now owns both the public read contract for the web app and the write and matching contract reused by the MCP server.
- The package now also owns the Phase 8 browser-auth actor-context and CMS-role foundation so the web app can stay thin as the CMS expands.

## Public Read Queries

- Country, region, and destination browse queries are country-scoped and sorted by title.
- Region overview pages can now request linked destination snippets through a shared region-to-destination browse query instead of rebuilding that join in the web layer.
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
- Listing tag mutation is not currently part of the shared write surface and is a planned CMS addition.

## Editorial MCP Services

- `listCategories` exposes the fixed curated categories used by listing validation.
- `listRegionsForEditor`, `listDestinationsForEditor`, and `listListingsForEditor` expose editor-visible records that can include draft and trashed content when requested.
- `getRegionForEditor`, `getDestinationForEditor`, and `getListingForEditor` return MCP-friendly record shapes with IDs and linked editorial metadata.
- `createRegion`, `createDestination`, and `assignDestinationRegions` centralize non-listing editorial writes needed by the MCP server.
- `findRegion`, `findDestination`, and `findListing` apply shared fuzzy matching with confidence and reason output.
- `ensureRegion`, `ensureDestination`, and `ensureListing` reuse those matchers so MCP creation flows stop on candidate ambiguity instead of guessing.
- `createListingDraftForEditor` derives the slug when omitted, validates evidence and related destination/image inputs up front, then reuses the existing listing write path.

## CMS/Auth Services

- Browser-authenticated CMS writes now have a shared actor-context and authorization foundation instead of defining role logic inside the web UI.
- Current roles are `admin`, `moderator`, and `viewer`.
- `getUserRole`, `ensureUserRole`, and `setUserRole` now manage app-owned CMS role rows that sit alongside Better Auth's own tables.
- `setModeratorRegionAssignments` is now a shared replace-all helper so moderator-region reconciliation can stay inside one service-layer write path.
- `listModeratorRegionAssignments` and `getAuthActorContext` expose moderator scope as shared domain data rather than page-local logic.
- `assertCanAccessCms`, `requireAdminActor`, and `createCmsWriteContext` now give CMS server actions one place to derive authorization and audit attribution.
- `admin` retains global CMS authority, `moderator` is prepared for assigned-region editorial scope, and `viewer` authenticates successfully but has no CMS access.
- `updateCmsUserAccess` now applies role changes plus moderator-region reconciliation atomically, rejects moderator saves with zero regions, and prevents demotion of the last remaining admin.
- `createCountryForCms`, `updateCountryForCms`, `createRegionForCms`, and `updateRegionForCms` now own Phase 9 admin-only country and region persistence with shared slug derivation and conflict rules.
- Later CMS additions should still implement shared destination, listing, and tag-write services with RBAC enforced in this package.

## Evidence And Matching Rules

- Evidence items require non-empty `label` and `note`; optional `url` values must parse as valid URLs.
- Region, destination, and listing create and ensure flows derive slugs from titles when no explicit slug is supplied.
- Derived or explicit slug collisions raise `CONFLICT`; services never auto-suffix.
- Name matching scores exact title and slug matches highest, then prefix and containment, then token overlap.
- Listing matching can boost confidence when region scope, destination scope, or nearby coordinates support an existing candidate.
- Find helpers return `exact_match`, `candidate_matches`, or `not_found` with shared `MatchCandidate` output fields.

## Validation and Error Rules

- Listing slugs stay unique within a region.
- Category slugs must exist before listing writes are accepted.
- Busyness rating must stay on the editorial `1` to `5` integer scale.
- Latitude and longitude remain the source of truth for map behavior and are validated for real-world bounds.
- Trashed listings cannot be edited, published, or unpublished until restored.
- Service-layer validation and authorization errors raise `ServiceError` values with `NOT_FOUND`, `CONFLICT`, `INVALID_INPUT`, `INVALID_STATE`, `FORBIDDEN`, or `INSUFFICIENT_EVIDENCE` codes.

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
- Editorial create services reject missing evidence with `INSUFFICIENT_EVIDENCE`.
- Editorial ensure services stop on candidate matches rather than auto-creating nearby duplicates.

## Tests

- `services.test.ts` provisions fresh temp SQLite databases, applies migrations, imports the shared seed dataset, and exercises the public query and listing write surface end to end.
- `editorial.test.ts` covers editorial region and destination creation, editor-visible listing reads, evidence requirements, fuzzy matching, ensure flows, and slug-collision protection.
- `auth.test.ts` covers CMS role creation, moderator-region actor context, CMS write-context gating, and admin detection.
- `cms.test.ts` covers Phase 9 user access management, last-admin protection, and admin country/region slug behavior.
