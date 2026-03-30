# Services Package

This package contains shared domain logic used by the public app, repository tooling, and the future MCP server.

## Current Responsibilities

- Shared seed validation, normalization, and import logic for Phase 3
- Shared public read/query modules for countries, regions, destinations, and listings
- Shared listing write/service modules for lifecycle, metadata, destination assignment, and gallery operations

## Exports

- `@explorers-map/services`
- `@explorers-map/services/countries`
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

## Local Commands

Run this from the repository root:

```bash
pnpm --filter @explorers-map/services typecheck
pnpm --filter @explorers-map/services test
```
