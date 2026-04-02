# Explorers Map Implementation Plan

This plan is intended for agent execution with human review at key checkpoints.

## Assumptions

- [x] Next.js boilerplate setup is provided by the human and is out of scope for the agent.
- [x] The repo should follow the shared-codebase structure described in `BRIEF.md`.
- [x] The public app is read-first for MVP.
- [x] The standalone MCP server is the primary machine-write interface for content operations.
- [x] SQLite is the chosen database for MVP.
- [x] Cloudflare S3-compatible object storage is the chosen image host, but upload strategy is still deferred.

## Phase 0 - Human Bootstrap

### Agent Tasks

- [x] Wait for the Next.js boilerplate template to exist in the repository.
- [x] Inspect the incoming boilerplate and align the workspace layout with the agreed shared-codebase structure.

### Human Required Steps

- [x] Provide the Next.js boilerplate template in the repository.
- [x] Confirm which package manager and workspace tooling should be treated as the default if the template does not already make that obvious.

## Phase 1 - Repository Structure and Tooling Foundations

### Agent Tasks

- [x] Restructure the repo into the agreed shared-codebase layout:
- [x] Create `apps/web` for the Next.js app.
- [x] Create `apps/mcp` for the standalone MCP server.
- [x] Create `packages/db` for Drizzle schema, client, and migrations.
- [x] Create `packages/services` for shared domain logic.
- [x] Create `packages/utils` for shared helpers.
- [x] Configure workspace-level package linking so `apps/web` and `apps/mcp` can import shared packages cleanly.
- [x] Set up TypeScript pathing or package exports for shared imports.
- [x] Add base environment variable handling for SQLite path, Cloudflare storage configuration placeholders, and MCP configuration placeholders.
- [x] Add root scripts for linting, typechecking, testing, database migration, and seeding.
- [x] Add a short developer README section explaining the workspace layout and package responsibilities.

### Human Required Steps

- [x] Review and approve any agent-proposed restructuring if the incoming boilerplate layout makes multiple reasonable workspace shapes possible.

## Phase 2 - Database Schema and Migration Layer

### Agent Tasks

- [x] Implement the Drizzle schema in `packages/db` for:
- [x] `countries`
- [x] `regions`
- [x] `destinations`
- [x] `destination_regions`
- [x] `categories`
- [x] `listings`
- [x] `listing_destinations`
- [x] `listing_images`
- [x] `tags`
- [x] `listing_tags`
- [x] Encode the agreed MVP fields for listings, including:
- [x] `status` with `draft` and `published`
- [x] `busynessRating`
- [x] `googleMapsPlaceUrl`
- [x] audit metadata (`createdBy`, `updatedBy`, `source`)
- [x] soft delete (`deletedAt`)
- [x] timestamps
- [x] Add appropriate uniqueness constraints and indexes for slugs and join tables.
- [x] Add migration files and verify the schema can be applied to SQLite cleanly.
- [x] Create a shared database client package for use by both `apps/web` and `apps/mcp`.
- [x] Document any schema assumptions that should remain stable for seed data and MCP tools.

### Human Required Steps

- [x] None.

## Phase 3 - Seed Pipeline and Initial Content Import

### Agent Tasks

- [x] Move or adapt the existing seed source into the shared workspace structure without losing the current content.
- [x] Connect the seed pipeline to the real Drizzle schema and SQLite database.
- [x] Implement idempotent seeding behavior suitable for development workflows.
- [x] Preserve stable seed IDs for entities that now carry explicit IDs in the seed source, including tags and listing images.
- [x] Seed countries, regions, destinations, categories, tags, listings, listing-destination links, listing images, and listing tags in dependency order.
- [x] Ensure seeded listing images persist explicit `sortOrder` values from the seed source.
- [x] Ensure seeded listings default to concrete lifecycle values, including `status`, `source`, nullable audit fields, and `deletedAt = null`.
- [x] Preserve support for placeholder image URLs during early development.
- [x] Keep the existing seed validation checks and extend them for any new schema constraints.
- [x] Add a smoke test or scripted verification that the seed completes successfully on a fresh database.

Note:

- A limited shared seed-import service ships in Phase 3 so repository scripts already follow the brief's shared write-path direction before the broader Phase 4 service layer arrives.

### Human Required Steps

- [x] Improve seed content, image paths, Google Maps place links, and gallery coverage when ready.

## Phase 4 - Shared Queries and Service Layer

Note:

- [x] Country, region, and destination detail lookups ship alongside the Phase 4 browse queries so Phase 5 page metadata, headers, and 404 handling can stay on shared query modules.
- [x] `create listing draft` currently means creating a fully populated listing row with `status = draft`, because the current MVP schema does not support sparse placeholder drafts.

### Agent Tasks

- [x] Implement read/query modules in `packages/services` for published public content:
- [x] countries browse queries
- [x] regions within country
- [x] destinations within country
- [x] listings within region
- [x] listings for destination
- [x] individual listing detail queries
- [x] Implement write/service modules for content operations:
- [x] create listing draft
- [x] update listing copy and metadata
- [x] set listing location and map fields
- [x] assign listing destinations
- [x] attach or reorder listing images
- [x] publish listing
- [x] unpublish listing
- [x] move listing to trash
- [x] restore listing from trash
- [x] Enforce business rules in the shared service layer instead of in UI or MCP handlers.
- [x] Ensure public read queries exclude `draft` and trashed records by default.
- [x] Ensure write operations populate audit metadata, `source`, and `updatedAt` consistently.
- [x] Add service-layer tests for key operations and guards.

### Human Required Steps

- [ ] None.

## Phase 5 - Public Web App MVP

### Agent Tasks

- [x] Implement the App Router structure described in the brief under `apps/web`.
- [x] Build the published public browsing experience for:
- [x] countries index
- [x] country page
- [x] regions index within country
- [x] region detail page
- [x] destinations index within country
- [x] destination detail page
- [x] region listings catalog
- [x] listing detail page
- [x] Ensure destination pages only show listings explicitly linked to that destination.
- [x] Ensure listing detail pages remain canonically routed under regions.
- [x] Implement category, tag, destination, and busyness filtering where planned for MVP.
- [x] Generate map links from coordinates and use `googleMapsPlaceUrl` when present.
- [x] Add metadata generation for countries, regions, destinations, and listings.
- [x] Handle empty states, 404s, unpublished content behavior, and trashed content exclusion cleanly.
- [x] Keep the UI aligned with the visual-first, calm, exploratory brief.

### Human Required Steps

- [x] Review visual direction, copy tone, and any design decisions that go beyond the established product brief.

## Phase 6 - Standalone MCP Server

Note:

- [ ] MCP `create listing draft` should reuse the Phase 4 shared service semantics, which create a complete draft listing rather than a sparse placeholder row.
- [ ] The initial MCP workflow is personal editorial use through ChatGPT, not generic external automation.
- [ ] MCP auth should ship in two stages: private API key first, OAuth later.

### Agent Tasks

- [ ] Set up the standalone MCP server under `apps/mcp`.
- [ ] Configure the MCP server to import shared database and service-layer code from workspace packages.
- [ ] Implement curated task-shaped MCP tools rather than unrestricted CRUD, including:
- [ ] fuzzy `find_region`
- [ ] fuzzy `find_destination`
- [ ] `list_listings` scoped to a region or destination
- [ ] `get_listing`
- [ ] `ensure_destination` so ChatGPT can reuse an existing destination or create one only when needed
- [ ] `create_listing_draft`
- [ ] `update_listing_copy`
- [ ] `update_listing_metadata`
- [ ] `set_listing_location`
- [ ] `assign_listing_destinations`
- [ ] `attach_listing_images`
- [ ] `improve_region_listings`
- [ ] `improve_destination_listings`
- [ ] `publish_listing`
- [ ] `move_listing_to_trash`
- [ ] `restore_listing_from_trash`
- [ ] Prefer lookup-and-improve flows over blind creation so ChatGPT checks for existing regions, destinations, and listings before creating new records.
- [ ] Implement fuzzy matching for destination, region, and listing reads so slight naming differences still resolve to likely existing records.
- [ ] Return structured match confidence or equivalent signals from fuzzy lookups so the assistant can avoid duplicate creation.
- [ ] Ensure write tools default to draft behavior unless the user explicitly requests publish behavior.
- [ ] Ensure MCP writes always set `source = mcp` and populate audit metadata where available.
- [ ] Add simple private MCP authentication for MVP using a bearer token or API key.
- [ ] Store the MVP MCP secret in environment configuration rather than hard-coding it.
- [ ] Reject unauthenticated MCP requests and document the expected auth header format.
- [ ] Add robust validation, structured success responses, and clear error handling for tool calls.
- [ ] Add a small read-only context surface for ChatGPT, such as platform guide, data model guide, and editorial rules resources.
- [ ] Add and maintain a repository document that can be used as baseline ChatGPT MCP context instructions.
- [ ] Add local documentation for how to run the MCP server and how it shares code with the app.
- [ ] Add smoke tests or scripted checks for the highest-value MCP tools.

### Human Required Steps

- [ ] Decide whether the MCP server is strictly local/internal for MVP or needs additional authentication and deployment hardening beyond a trusted internal setup.

## Phase 7 - Content Lifecycle, Trash, and Operational Polish

### Agent Tasks

- [ ] Extend shared lifecycle support with reusable trash-aware query helpers and broader restore/lifecycle consistency coverage across app, MCP, and scripts.
- [ ] Add status-aware content utilities so draft and published content behavior stays consistent.
- [ ] Add reusable helpers for audit metadata population, `source` defaults, and update timestamps.
- [ ] Create internal scripts or maintenance commands for common content operations if useful.
- [ ] Expand coverage for soft delete, restore, publish, and unpublish behaviors across the remaining runtime surfaces.
- [ ] Verify seeded content, public pages, and MCP tools all respect the same lifecycle rules.
- [ ] Add concise operational documentation for database setup, migrations, seeding, MCP usage, and content-state expectations.

### Human Required Steps

- [ ] Review whether any additional operational safeguards are needed before real content editing begins.

## Phase 8 - MCP OAuth Upgrade

### Agent Tasks

- [ ] Add OAuth-based authentication for the remote MCP server as the long-term ChatGPT connector auth model.
- [ ] Keep the existing MCP tool surface compatible while replacing or superseding the temporary API key flow.
- [ ] Implement token validation and any required session or principal mapping needed by the shared service layer.
- [ ] Ensure OAuth-authenticated requests still populate audit metadata consistently.
- [ ] Update MCP runtime documentation to describe the OAuth flow and any required setup.
- [ ] Update context and interface documentation so the expected auth model for ChatGPT connector usage is clear.

### Human Required Steps

- [ ] Configure and approve the OAuth provider/app registration details needed for the remote ChatGPT connector setup.

## Deferred Until Later

- [ ] Decide the Cloudflare S3-compatible upload workflow:
- [ ] direct upload from a trusted UI
- [ ] mediated upload through a server process
- [ ] URL-only asset registration workflow
- [ ] Decide whether to add multilingual support in a later phase.
- [ ] Reassess whether SQLite remains sufficient once both the app and MCP server are actively writing content.
