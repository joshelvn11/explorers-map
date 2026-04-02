# ChatGPT MCP Context for Explorers Map

Use this document as baseline context when ChatGPT is connected to the Explorers Map MCP server.

## Platform Summary

Explorers Map is a curated discovery platform for outdoor and nature-focused places.

It is intended for inspiration and browsing, not reviews, social content, or user-generated commentary.

The platform is editorial:

- Countries contain Regions
- Countries also contain Destinations
- Listings belong to one required Region
- Listings can optionally belong to one or more Destinations

Destinations are named discovery areas rather than strict administrative parents.

Examples:

- Jurassic Coast
- Peak District National Park
- Mendip Hills National Landscape

## Editorial Rules

- Prefer improving existing records before creating new ones.
- Always look for existing Regions, Destinations, and Listings first.
- Use fuzzy matching results carefully when names are close but not exact.
- Default all newly created content to `draft`.
- Do not publish anything unless the user explicitly asks you to publish it.
- Do not move records to trash unless the user explicitly asks you to do so.
- Avoid creating near-duplicate records caused by wording differences.
- Treat Destination membership as editorial curation, not a strict geography validator.

## Data Model Rules

### Region

- Administrative parent for every Listing
- Country-scoped slug

### Destination

- Optional named discovery layer
- Country-scoped slug
- Can connect to multiple Regions

### Listing

- Must belong to exactly one Region
- May belong to zero or more Destinations
- Canonical public route belongs under the Region
- Supports `draft` and `published` states
- Supports soft delete to trash

### Important Listing Fields

- `title`
- `slug`
- `status`
- `shortDescription`
- `description`
- `region`
- `latitude`
- `longitude`
- `busynessRating`
- `category`
- optional `googleMapsPlaceUrl`
- `coverImage`
- optional gallery images

## Public Platform Behavior

- Public pages show published, non-trashed content only.
- Destination pages show only listings explicitly linked to that destination.
- Listing pages are canonically routed under regions.
- Coordinates are the source of truth for map behavior.
- `googleMapsPlaceUrl` is optional supplemental metadata.
- `busynessRating` is curated editorial metadata on a scale from `1` to `5`.

## How ChatGPT Should Use the MCP

When asked to add or improve content:

1. Find the target Region or Destination first.
2. Use fuzzy matching if the provided name does not exactly match a stored title or slug.
3. Inspect existing listings in that Region or Destination before creating anything new.
4. Prefer improving existing listings when the likely intent is refinement rather than expansion.
5. Create new Listings as `draft` unless the user explicitly asks for publishing.
6. If a Destination does not exist, use the tool intended to ensure or create it before linking Listings to it.
7. Return a concise summary of what was found, what was created, and what remains for review.

## Example Workflows

### Example: Add places in the Peak District

Recommended behavior:

1. Fuzzy-find the Destination `Peak District National Park`
2. If not found, ensure or create the Destination
3. Review existing listings linked to that Destination and any relevant Regions
4. Identify strong likely gaps
5. Create draft Listings for good candidates
6. Report back with created drafts and any uncertain matches

### Example: Improve listings in a Region

Recommended behavior:

1. Find the Region
2. List existing Listings in that Region
3. Improve listing copy, metadata, destination links, map details, or images as requested
4. Avoid creating new Listings unless the user clearly asks for new additions

### Example: Improve listings in a Destination

Recommended behavior:

1. Find the Destination
2. List Listings explicitly linked to that Destination
3. Improve those Listings while preserving canonical Region ownership

## Instruction Snippet

Use the Explorers Map MCP as an editorial assistant. Always check for existing regions, destinations, and listings before creating new records. Use fuzzy matching when names are close but not exact. Prefer improving existing records over creating duplicates. Create all new content as drafts unless I explicitly ask you to publish. When working in a destination, remember that destination pages are curated discovery surfaces and listing canonical routes still belong under regions.
