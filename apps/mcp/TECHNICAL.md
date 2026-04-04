# MCP App Technical Notes

## Purpose

`apps/mcp` implements the standalone Explorers Map MCP server for AI-assisted editorial curation of regions, destinations, and listings.

## Runtime Shape

- Transport: stateless Streamable HTTP using the official TypeScript MCP SDK
- HTTP runtime: Node `http` server with one fresh `McpServer` plus `StreamableHTTPServerTransport` per request
- Routes:
  - `POST /mcp`
  - `GET /healthz`
- Auth: bearer token via `Authorization: Bearer <token>`

The runtime is intentionally thin. It adapts HTTP, auth, and MCP concerns and delegates business rules to `packages/services`.

## Implemented Tool Groups

- Reference tools:
  `list_categories`, `list_regions`, `get_region`, `list_destinations`, `get_destination`, `list_listings`, `get_listing`
- Fuzzy lookup tools:
  `find_region`, `find_destination`, `find_listing`
- Safe creation tools:
  `ensure_region`, `create_region`, `ensure_destination`, `create_destination`, `assign_destination_regions`, `ensure_listing`, `create_listing_draft`
- Update and lifecycle tools:
  `update_listing_copy`, `update_listing_metadata`, `set_listing_location`, `assign_listing_destinations`, `attach_listing_images`, `publish_listing`, `move_listing_to_trash`, `restore_listing_from_trash`

## Resource Surface

The server exposes three read-only MCP resources:

- `explorers-map://context/platform`
  Backed by root `BRIEF.md`
- `explorers-map://context/data-model`
  Backed by root `TECHNICAL.md`
- `explorers-map://context/editorial-rules`
  Backed by root `CHATGPT_MCP_CONTEXT.md`

This keeps the ChatGPT-facing guidance single-sourced from the repository docs.

## Shared Service Dependencies

The MCP runtime depends on shared services for:

- category, region, destination, and listing editor reads
- region and destination creation plus destination-region assignment
- duplicate-safe fuzzy matching and `ensure_*` workflows
- listing draft creation, copy edits, metadata edits, location changes, destination assignment, image replacement, publish, trash, and restore
- evidence normalization and slug derivation

The MCP layer does not write directly to the DB.

## Auth And Error Behavior

- Requests without a valid bearer token are rejected at the HTTP layer with a structured JSON-RPC error body and HTTP `401`.
- Tool-level validation and domain failures are returned as MCP tool errors with `isError: true` and structured `{ error: { code, message } }` payloads.
- Expected editorial non-terminal outcomes such as `candidate_matches` and `insufficient_evidence` are returned as structured tool results rather than hard transport failures.

## Guardrails

- Prefer lookup-before-create workflows for all editorial operations.
- Require structured `evidence[]` input for new records and new factual claims.
- Return candidate matches and stop when fuzzy matching is ambiguous.
- Refuse incomplete listing draft creation because the current schema requires a complete draft row.
- Keep categories fixed and curated rather than allowing category creation through MCP.
- Default MCP-created listings to `draft` unless the caller explicitly invokes publish behavior.
- Keep listing write audit and source behavior aligned with shared services by always using `source = "mcp"` and leaving actor IDs `null` in bearer-token mode.
