---
name: explorers-map-mcp
description: Use when working with the Explorers Map MCP server to research, create, or update editorial content for regions, destinations, and listings. This skill is for duplicate-safe, evidence-first MCP workflows that must prefer lookup before creation, stop on ambiguity, default new listings to draft, and follow the repository's editorial rules.
---

# Explorers Map MCP

Use this skill when the task involves the Explorers Map MCP server or editorial content operations through MCP.

Do not use this skill for normal app or package code changes unless the task is specifically about MCP-driven content work.

## Preconditions

- The Explorers Map MCP server is available to Codex.
- The MCP requires bearer-token auth.
- New facts and new records must be evidence-backed.

If the MCP server is not configured or reachable, say so clearly and fall back to repo inspection only when that still helps.

## Core Rules

- Always check for existing regions, destinations, and listings before creating anything.
- Prefer improving existing records over creating new ones.
- Use fuzzy matching when names may differ, but stop on ambiguity and return candidate matches instead of guessing.
- Never invent places, coordinates, descriptions, destination links, or metadata.
- Treat destination membership as editorial curation, not strict geography validation.
- Create new listings as `draft` unless the user explicitly asks to publish.
- Do not trash or restore content unless the user explicitly asks.
- Do not create placeholder-only listings. If required listing fields are missing or weakly grounded, stop and explain what is missing.

## Minimum Workflow

### Regions

1. Use `find_region` when the provided name may not exactly match the stored title or slug.
2. Use `get_region` when the slug is already known or the fuzzy result is unambiguous.
3. Use `ensure_region` before `create_region` when the request may refer to an existing region.
4. Only use `create_region` when duplicate checking is already done and evidence is present.

### Destinations

1. Use `find_destination` first when the name may vary.
2. Use `get_destination` to inspect the canonical record and linked regions.
3. Use `ensure_destination` before `create_destination` when the request may match an existing destination.
4. Use `assign_destination_regions` after creation or when the region set needs explicit curation.

### Listings

1. Find the parent region or destination first.
2. Use `list_listings` in the relevant region or destination to inspect existing editorial coverage.
3. Use `find_listing` before any listing creation.
4. Use `ensure_listing` when you want duplicate-safe creation with evidence and a complete payload.
5. Use `create_listing_draft` only when duplicate checking is complete and all required fields are grounded.
6. Use `update_listing_copy`, `update_listing_metadata`, `set_listing_location`, `assign_listing_destinations`, and `attach_listing_images` for improvement work.
7. Use `publish_listing`, `move_listing_to_trash`, and `restore_listing_from_trash` only on explicit user instruction.

## Evidence Rules

For creation or new factual claims, supply non-empty `evidence[]` when the tool supports it.

Each evidence item should include:

- `label`
- `note`
- optional `url`

Use evidence to justify:

- why a place exists
- why a new region or destination is needed
- why a listing title, location, or metadata is trustworthy
- why a destination relationship is editorially appropriate

If you cannot provide credible evidence, do not create the record.

## Required Listing Creation Fields

When creating a listing draft, make sure the payload is complete:

- `countrySlug`
- `regionSlug`
- `title`
- `shortDescription`
- `description`
- `latitude`
- `longitude`
- `busynessRating`
- `coverImage`
- `categorySlug`
- optional `slug`
- optional `googleMapsPlaceUrl`
- optional `destinationSlugs`
- optional `images`
- required `evidence`

If `slug` is omitted, the server derives it from the title. Slug collisions should be treated as a stop condition, not something to auto-fix by suffixing.

## Response Style

When reporting MCP work back to the user:

- say what was matched, created, or updated
- mention evidence used for new records or factual changes
- call out ambiguity or missing evidence explicitly
- keep summaries concise and operational

## Useful References

Read these only when needed:

- [CHATGPT_MCP_CONTEXT.md](CHATGPT_MCP_CONTEXT.md) for the editorial guidance source text
- [apps/mcp/API.md](apps/mcp/API.md) for tool contracts and response shapes
- [apps/mcp/README.md](apps/mcp/README.md) for runtime and auth details
