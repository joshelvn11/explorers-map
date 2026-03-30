# Seed Data Notes

This folder is the editable source of truth for the app's initial curated content.

## Files

- `index.mjs`
  The source dataset for countries, regions, destinations, listings, tags, images, and join records.
- `generated/seed.snapshot.json`
  A generated JSON snapshot written by `node scripts/seed.mjs` after validation passes.

## Current assumptions

- Listings belong to one required region.
- Listings can belong to zero or more destinations through `listingDestinations`.
- Coordinates are the source of truth for map behavior.
- Listings include a curated `busynessRating` from 1 to 5.
- `googleMapsPlaceUrl` is optional and intended for richer Google place links later.
- Image paths currently point at placeholder local paths under `/images/seed/`.

## Recommended improvements

- Replace placeholder image paths with real local assets once the image set is ready.
- Add `googleMapsPlaceUrl` values for listings where you want a direct place page link rather than a generated coordinates link.
- Review descriptions and short descriptions for tone consistency once the UI is in place.
- Expand gallery coverage so more listings have supporting imagery.
- Add a second country later if you want to test country-scoped slug behavior more aggressively.

## Running the validator

```bash
node scripts/seed.mjs
```

This validates the dataset, writes the generated snapshot, and prints any warnings that are worth tightening up before database import.
