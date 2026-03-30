# Seed Data Notes

This folder is the editable source of truth for the app's initial curated content.

## Files

- `index.mjs`
  The source dataset for countries, regions, destinations, listings, tags, images, and join records.
- `generated/seed.snapshot.json`
  A generated normalized JSON snapshot written by `pnpm seed` before database import.

## Current assumptions

- Listings belong to one required region.
- Listings can belong to zero or more destinations through `listingDestinations`.
- Tags now carry stable `id` values so DB seeding can preserve deterministic records.
- Listing gallery records now carry stable `id` values and explicit `sortOrder`.
- Coordinates are the source of truth for map behavior.
- Listings include a curated `busynessRating` from 1 to 5.
- Listings now declare explicit `status`, `source`, and `deletedAt` values for lifecycle-aware seeding.
- `googleMapsPlaceUrl` is optional and intended for richer Google place links later.
- Images currently use stable Lorem Picsum placeholder URLs.

## Recommended improvements

- Replace the Lorem Picsum placeholders with final production-ready image assets once the image set is ready.
- Add `googleMapsPlaceUrl` values for listings where you want a direct place page link rather than a generated coordinates link.
- Review descriptions and short descriptions for tone consistency once the UI is in place.
- Expand gallery coverage so more listings have supporting imagery.
- Add a second country later if you want to test country-scoped slug behavior more aggressively.

## Running the validator

```bash
pnpm seed:validate
```

This validates the editable dataset, applies lifecycle defaults in memory, and prints counts and warnings without touching the database.

## Importing into SQLite

```bash
pnpm seed
```

This validates the dataset, writes the generated snapshot, and imports the normalized data into the configured SQLite database through the shared seed service in `packages/services`.

## Idempotent sync behavior

- Seeded parent records are upserted by stable ID or slug.
- Seed-managed joins and listing gallery rows are reconciled on rerun so stale seeded relationships are removed.
- Records not represented by the current seed source are left untouched.

## Smoke verification

```bash
pnpm seed:smoke
```

This creates a fresh temp SQLite database, runs migrations, imports the seed twice, and verifies counts, representative IDs, lifecycle defaults, sort order preservation, and key seeded relationships.
