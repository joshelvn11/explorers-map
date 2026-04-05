# Services Package

This package contains shared domain logic used by the public app, repository tooling, and the MCP server.

## Current Responsibilities

- Shared seed validation, normalization, and import logic for Phase 3
- Shared public read/query modules for countries, regions, destinations, and listings
- Shared listing write/service modules for lifecycle, metadata, destination assignment, and gallery operations
- Shared editorial service modules for MCP-facing category, region, destination, and listing reads, matching, ensure flows, and safe creation
- Shared CMS/auth service responsibilities such as actor context, permission checks, and CMS write-context helpers
- Shared Phase 9 CMS admin services for user access management plus country/region create and edit flows
- Shared Phase 10a CMS destination services for actor-aware reads plus moderator-safe destination create/edit flows
- Shared Phase 10b CMS listing services for actor-aware reads plus moderator-safe listing create/edit/lifecycle flows

## Exports

- `@explorers-map/services`
- `@explorers-map/services/auth`
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

Current CMS/auth additions:

- shared authenticated actor context and role helpers
- viewer, moderator, and admin role lookup and persistence helpers
- moderator-region scope helpers for admin and moderator flows
- CMS write-context helpers that convert an authorized actor into the existing shared write-context shape
- Phase 9 admin helpers for listing users, updating roles with moderator-region reconciliation, and guarding last-admin demotion
- Phase 9 country and region CMS helpers with shared slug derivation and conflict handling
- Phase 10a destination helpers for visible destination listing, destination detail access, moderator-manageable region options, and moderator-safe destination-region replacement within assigned scope
- Phase 10b listing helpers for visible listing listing/detail reads, moderator-manageable region and destination options, create/edit/lifecycle operations, and canonical slug redirects after listing edits

Planned CMS additions:

- listing tag-write support

## Local Commands

Run this from the repository root:

```bash
pnpm --filter @explorers-map/services typecheck
pnpm --filter @explorers-map/services test
```
