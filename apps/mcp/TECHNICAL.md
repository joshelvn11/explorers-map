# MCP App Technical Notes

## Purpose

`apps/mcp` is reserved for the standalone MCP server.

The server is intended to support AI-assisted editorial curation of regions, destinations, and listings without allowing ChatGPT to create duplicates or hallucinated content.

## Intended Responsibilities

- Expose curated task-shaped MCP tools
- Expose a small read-only context resource surface for platform, data-model, and editorial guidance
- Reuse shared write logic from `packages/services`
- Reuse shared schema and database access from `packages/db`
- Act as the primary machine-write interface for content operations

## Planned Tool Groups

- Reference tools:
  `list_categories`, `list_regions`, `get_region`, `list_destinations`, `get_destination`, `list_listings`, `get_listing`
- Fuzzy lookup tools:
  `find_region`, `find_destination`, `find_listing`
- Safe creation tools:
  `ensure_region`, `create_region`, `ensure_destination`, `create_destination`, `assign_destination_regions`, `ensure_listing`, `create_listing_draft`
- Update and lifecycle tools:
  `update_listing_copy`, `update_listing_metadata`, `set_listing_location`, `assign_listing_destinations`, `attach_listing_images`, `publish_listing`, `move_listing_to_trash`, `restore_listing_from_trash`

## Planned Operating Rules

- Prefer lookup-before-create workflows for all editorial operations.
- Require structured `evidence[]` input for new records and new factual claims.
- Return candidate matches and stop when fuzzy matching is ambiguous.
- Refuse incomplete listing draft creation because the current DB schema requires a complete draft row.
- Keep categories fixed and curated rather than allowing category creation through MCP.
- Default MCP-created content to `draft` unless the caller explicitly asks to publish.

## Shared Service Dependencies

The MCP layer should be thin and should rely on shared services for:

- region creation
- destination creation
- destination-region assignment
- listing creation and listing lifecycle
- fuzzy region, destination, and listing matching
- editor-visible listing reads used for duplicate checks

This keeps database rules, validation, and audit behavior consistent with the rest of the repo.

## Planned Resource Surface

The server should expose a small set of read-only MCP resources:

- platform guide
- data model guide
- editorial rules guide

These resources should point ChatGPT at the same core guidance already documented in `BRIEF.md`, `TECHNICAL.md`, and `CHATGPT_MCP_CONTEXT.md`.

## Authentication Direction

- MVP auth should use a private bearer token or API key stored in environment configuration.
- Unauthenticated requests should be rejected with a structured error.
- OAuth remains the later Phase 8 upgrade path for remote ChatGPT connector use.

## Guardrails

- Do not implement a second source of truth for write logic here.
- Prefer task-shaped tools over unrestricted CRUD.
- Keep audit metadata and source tracking consistent with shared service rules.
- Avoid raw database writes that bypass the shared service layer unless the brief is explicitly changed.
- Do not auto-create records when fuzzy matches are ambiguous.
- Do not create placeholder-only listings to satisfy a prompt.
- Do not treat the absence of evidence as permission to invent missing facts.
