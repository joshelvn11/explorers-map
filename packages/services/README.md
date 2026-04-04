# Services Package

This package contains shared domain logic used by the public app, repository tooling, and the MCP server.

## Current Responsibilities

- Shared seed validation, normalization, and import logic for Phase 3
- Shared public read/query modules for countries, regions, destinations, and listings
- Shared listing write/service modules for lifecycle, metadata, destination assignment, and gallery operations
- Shared editorial service modules for MCP-facing category, region, destination, and listing reads, matching, ensure flows, and safe creation
- Planned future CMS/auth service responsibilities such as actor context, permission checks, and web-CMS write operations

## Exports

- `@explorers-map/services`
- `@explorers-map/services/countries`
- `@explorers-map/services/editorial`
- `@explorers-map/services/destinations`
- `@explorers-map/services/listings`
- `@explorers-map/services/errors`
- `@explorers-map/services/seed`

## Service Surface

Read queries:

- `listCountries`
- `getCountryBySlug`
- `listRegionsForCountry`
- `getRegionBySlug`
- `listDestinationsForCountry`
- `listDestinationsForRegion`
- `getDestinationBySlug`
- `listListingsForRegion`
- `listListingsForDestination`
- `getListingDetail`

Listing writes:

- `createListingDraft`
- `updateListingCopyAndMetadata`
- `setListingLocation`
- `assignListingDestinations`
- `setListingImages`
- `publishListing`
- `unpublishListing`
- `trashListing`
- `restoreListing`

Editorial MCP support:

- `listCategories`
- `listRegionsForEditor`
- `findRegion`
- `getRegionForEditor`
- `ensureRegion`
- `createRegion`
- `listDestinationsForEditor`
- `findDestination`
- `getDestinationForEditor`
- `ensureDestination`
- `createDestination`
- `assignDestinationRegions`
- `listListingsForEditor`
- `findListing`
- `getListingForEditor`
- `ensureListing`
- `createListingDraftForEditor`

Planned CMS additions:

- shared authenticated actor context and role helpers
- RBAC-aware CMS operations for countries, regions, destinations, and listings
- listing tag-write support
- user-role-aware moderation scope helpers for admin and moderator flows

## Local Commands

Run this from the repository root:

```bash
pnpm --filter @explorers-map/services typecheck
pnpm --filter @explorers-map/services test
```
