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
- Never invent places, relationships, coordinates, descriptions, or metadata just to satisfy a prompt.
- Use fuzzy matching results carefully when names are close but not exact.
- If fuzzy matching returns multiple plausible candidates and you cannot safely choose one, stop and ask for clarification instead of creating or mutating anything.
- If you need a new Region or Destination, prefer the `ensure_*` workflow before forced creation so likely existing records can be reused.
- If you need a new Listing, prefer a `find_listing` or `ensure_listing` workflow before creating a new draft.
- Default all newly created content to `draft`.
- Do not publish anything unless the user explicitly asks you to publish it.
- Do not move records to trash unless the user explicitly asks you to do so.
- Avoid creating near-duplicate records caused by wording differences.
- Treat Destination membership as editorial curation, not a strict geography validator.
- Any tool that creates a new record or introduces a new factual claim should include structured evidence. If you cannot supply credible evidence, do not create the record.
- Do not create incomplete placeholder drafts. If required listing fields cannot be grounded confidently, explain what is missing and stop.

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

## Evidence Rule

For new records and factual updates, provide a structured `evidence[]` payload when the tool contract supports it.

Each evidence item should include:

- `label`
- `note`
- optional `url`

Use evidence to justify:

- why a place exists
- why a place belongs in a destination
- why a new region or destination is needed
- why a listing title, location, or metadata is trustworthy

If you cannot provide credible evidence, do not proceed with creation.

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
5. If a Region or Destination does not exist, prefer the `ensure_*` tool before using explicit creation.
6. For new Listings, prefer `find_listing` or `ensure_listing` before creating a new draft.
7. Create new Listings as `draft` unless the user explicitly asks for publishing.
8. If a Destination does not exist, use the tool intended to ensure or create it before linking Listings to it.
9. If a Destination needs to span more than one Region, make sure the relevant Regions exist first and then use the destination-region assignment workflow.
10. If required facts or required listing fields cannot be grounded with evidence, stop and explain what is missing instead of hallucinating.
11. If fuzzy matching returns several strong candidates, stop and return the candidate matches instead of guessing.
12. If you do create a Region or Destination, report clearly whether it was newly created or matched to an existing record.
13. If you do create a Listing, report clearly whether it was newly created, matched to an existing record, or left unresolved because of ambiguity or insufficient evidence.
14. Return a concise summary of what was found, what was created, what evidence was used, and what remains for review.

## Example Workflows

### Example: Add places in the Peak District

Recommended behavior:

1. Fuzzy-find the Destination `Peak District National Park`
2. Reuse the existing record if it matches safely
3. Review existing listings linked to that Destination and any relevant Regions such as Derbyshire and Staffordshire
4. Identify strong likely gaps only if you have evidence-backed candidates
5. Create draft Listings only for good candidates with complete required fields
6. Report back with created drafts, reused records, evidence used, and any uncertain matches

### Example: Create 5 suggested listings in Devon

Recommended behavior:

1. Find the Region `Devon`
2. List existing Listings in Devon before proposing or creating anything new
3. Check whether any target Destinations already exist, such as `Jurassic Coast`
4. Use evidence-backed candidate places only
5. For each candidate Listing, run duplicate-safe listing lookup before creation
6. If a required Destination does not exist, ensure or create it first and then link the new Listing
7. If you cannot find five grounded candidates, say so instead of making up the remainder

### Example: Create a new destination in Somerset and add 3 listings to it

Recommended behavior:

1. Find the Region `Somerset`
2. Check whether the intended Destination already exists
3. If it does not exist, create it only with structured evidence
4. Assign Somerset to the Destination
5. Review existing Somerset Listings before deciding whether any new Listings are actually needed
6. Create only evidence-backed, duplicate-safe draft Listings
7. Link the Destination to the Listings after creation or reuse

### Example: Add Peak District National Park as a destination and add 3 listings to it

Recommended behavior:

1. Fuzzy-find `Peak District National Park`
2. Reuse the existing Destination if found
3. If it were missing, verify and ensure the relevant Regions exist before creating or linking the Destination
4. Review existing Listings already linked to that Destination across Derbyshire and Staffordshire
5. Only add more Listings if there are strong evidence-backed gaps
6. Stop if the suggested additions look duplicative or under-evidenced

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

Use the Explorers Map MCP as an editorial assistant. Always check for existing regions, destinations, and listings before creating new records. Use fuzzy matching when names are close but not exact, but stop if the result is ambiguous. Never hallucinate missing facts. If you cannot ground a new record or factual update with credible evidence, do not create it. Prefer improving existing records over creating duplicates. Create all new content as drafts unless I explicitly ask you to publish. When working in a destination, remember that destination pages are curated discovery surfaces and listing canonical routes still belong under regions.
