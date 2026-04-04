# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

## [Unreleased]

### Added

- Added the initial Drizzle schema, shared SQLite client, and migration workflow in `packages/db`.
- Added repo-level DB scripts and environment scaffolding for the shared SQLite path and deferred Cloudflare/MCP config.
- Updated the seed source and validator to include tag IDs, listing image IDs and sort order, and explicit listing lifecycle/source fields.
- Replaced local seed image placeholders with stable Lorem Picsum URLs for covers and gallery images.
- Tightened the implementation plan checklist for later phases so seeding, audit metadata, source defaults, image ordering, and timestamps match the shipped schema.
- Added a shared Phase 3 seed import service, normalized seed snapshot generation, and smoke verification for idempotent SQLite seeding.
- Added a root `pnpm studio` shortcut for launching Drizzle Studio with the workspace config.
- Added Phase 4 shared country, region, destination, and listing query modules plus listing write services for lifecycle, metadata, destination assignment, and gallery management.
- Added typed service errors and a Node-based service test suite covering public visibility rules, lifecycle transitions, audit/source stamping, destination guards, and gallery replacement.
- Added the Phase 5 public web MVP in `apps/web`, including country, region, destination, region-catalog, and canonical listing routes with metadata, 404 handling, and image-first browsing UI.
- Added shared region catalog filtering in `packages/services` with URL-friendly category, tag, destination, and busyness filters plus stable public facet data for the web app.
- Added shared region-linked destination queries and a second destination snippet on region overview pages.
- Added a dedicated region destinations page so region overview destination snippets can drill into all destinations linked to that region.
- Added `CHATGPT_MCP_CONTEXT.md` with reusable platform, editorial, and data-model instructions for future ChatGPT-driven MCP usage.
- Added planned MCP contract documentation in `apps/mcp/API.md`, covering the intended tool surface, shared result shapes, evidence rules, and editorial workflows.
- Added the Phase 6 standalone MCP server in `apps/mcp` with stateless Streamable HTTP transport, bearer-token auth, read-only context resources, and editorial tools for regions, destinations, and listings.
- Added shared editorial services in `packages/services` for MCP-facing reads, fuzzy matching, evidence validation, `ensure_*` flows, safe region and destination creation, and duplicate-aware listing draft creation.
- Added MCP package scripts, tests, and root shortcuts for MCP dev, typecheck, and test workflows.
- Added automatic repo-root `.env` loading for the MCP dev and start scripts so local bearer-token setup works without manual shell export.
- Added a Phase 7 Actions HTTP API under `apps/web` for custom GPT use, including authenticated list/search/get/create endpoints for countries, categories, regions, destinations, and listings.
- Added a checked-in OpenAPI 3.1 contract for the Actions API plus `/api/actions/openapi.json`, route tests, and custom-GPT usage docs.
- Updated the web app dev, build, and start scripts to auto-load the repo-root `.env` file so Actions API auth works from the same local env setup as the MCP server.
- Added a second production GPT import schema plus `/api/actions/openapi.production.json`, using `https://explorersmap.org` and omitting utility endpoints from the ChatGPT-facing action list.

### Changed

- Refined the MCP plan around personal editorial use through ChatGPT rather than generic CRUD automation.
- Updated the MCP implementation plan to emphasize fuzzy lookup, lookup-before-create flows, destination ensuring, and draft-first content creation.
- Split the MCP authentication plan into two stages: private API key first for MVP and OAuth later for the proper remote ChatGPT connector phase.
- Expanded the planned MCP tool surface to include region and destination creation workflows, including safer `ensure_*` patterns and duplicate-aware creation guidance.
- Extended the planned MCP workflow with `find_listing` and `ensure_listing` so listing creation can follow the same duplicate-safe lookup-before-create pattern as regions and destinations.
- Tightened the planned MCP editorial rules around evidence-first creation, ambiguity-stop behavior, explicit destination-region assignment, and refusal of placeholder-only listing drafts.
- Updated the MCP docs from planned-only status to implemented runtime guidance, including the `/mcp` endpoint, bearer auth header format, and the shipped Phase 6 tool and resource surface.
- Updated the brief and implementation plan so the earlier no-Next.js-CRUD assumption now explicitly allows a narrow authenticated Actions API inside `apps/web` as a deliberate exception for private custom GPT workflows.
