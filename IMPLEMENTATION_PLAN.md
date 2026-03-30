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
- [ ] Add base environment variable handling for SQLite path, Cloudflare storage configuration placeholders, and MCP configuration placeholders.
- [x] Add root scripts for linting, typechecking, testing, database migration, and seeding.
- [x] Add a short developer README section explaining the workspace layout and package responsibilities.

### Human Required Steps

- [x] Review and approve any agent-proposed restructuring if the incoming boilerplate layout makes multiple reasonable workspace shapes possible.

## Phase 2 - Database Schema and Migration Layer

### Agent Tasks

- [ ] Implement the Drizzle schema in `packages/db` for:
- [ ] `countries`
- [ ] `regions`
- [ ] `destinations`
- [ ] `destination_regions`
- [ ] `listings`
- [ ] `listing_destinations`
- [ ] `listing_images`
- [ ] `tags`
- [ ] `listing_tags`
- [ ] Encode the agreed MVP fields for listings, including:
- [ ] `status` with `draft` and `published`
- [ ] `busynessRating`
- [ ] `googleMapsPlaceUrl`
- [ ] audit metadata (`createdBy`, `updatedBy`, `source`)
- [ ] soft delete (`deletedAt`)
- [ ] timestamps
- [ ] Add appropriate uniqueness constraints and indexes for slugs and join tables.
- [ ] Add migration files and verify the schema can be applied to SQLite cleanly.
- [ ] Create a shared database client package for use by both `apps/web` and `apps/mcp`.
- [ ] Document any schema assumptions that should remain stable for seed data and MCP tools.

### Human Required Steps

- [ ] None.

## Phase 3 - Seed Pipeline and Initial Content Import

### Agent Tasks

- [ ] Move or adapt the existing seed source into the shared workspace structure without losing the current content.
- [ ] Connect the seed pipeline to the real Drizzle schema and SQLite database.
- [ ] Implement idempotent seeding behavior suitable for development workflows.
- [ ] Seed countries, regions, destinations, categories, tags, listings, listing-destination links, listing images, and listing tags in dependency order.
- [ ] Ensure seeded listings default to sensible `status`, `source`, audit, and trash values.
- [ ] Preserve support for placeholder image URLs during early development.
- [ ] Keep the existing seed validation checks and extend them for any new schema constraints.
- [ ] Add a smoke test or scripted verification that the seed completes successfully on a fresh database.

### Human Required Steps

- [ ] Improve seed content, image paths, Google Maps place links, and gallery coverage when ready.

## Phase 4 - Shared Queries and Service Layer

### Agent Tasks

- [ ] Implement read/query modules in `packages/services` for published public content:
- [ ] countries browse queries
- [ ] regions within country
- [ ] destinations within country
- [ ] listings within region
- [ ] listings for destination
- [ ] individual listing detail queries
- [ ] Implement write/service modules for content operations:
- [ ] create listing draft
- [ ] update listing copy and metadata
- [ ] set listing location and map fields
- [ ] assign listing destinations
- [ ] attach or reorder listing images
- [ ] publish listing
- [ ] unpublish listing
- [ ] move listing to trash
- [ ] restore listing from trash
- [ ] Enforce business rules in the shared service layer instead of in UI or MCP handlers.
- [ ] Ensure public read queries exclude `draft` and trashed records by default.
- [ ] Ensure write operations populate audit metadata and `source` consistently.
- [ ] Add unit tests for key service-layer operations and guards.

### Human Required Steps

- [ ] None.

## Phase 5 - Public Web App MVP

### Agent Tasks

- [ ] Implement the App Router structure described in the brief under `apps/web`.
- [ ] Build the published public browsing experience for:
- [ ] countries index
- [ ] country page
- [ ] regions index within country
- [ ] region detail page
- [ ] destinations index within country
- [ ] destination detail page
- [ ] region listings catalog
- [ ] listing detail page
- [ ] Ensure destination pages only show listings explicitly linked to that destination.
- [ ] Ensure listing detail pages remain canonically routed under regions.
- [ ] Implement category, tag, destination, and busyness filtering where planned for MVP.
- [ ] Generate map links from coordinates and use `googleMapsPlaceUrl` when present.
- [ ] Add metadata generation for countries, regions, destinations, and listings.
- [ ] Handle empty states, 404s, unpublished content behavior, and trashed content exclusion cleanly.
- [ ] Keep the UI aligned with the visual-first, calm, exploratory brief.

### Human Required Steps

- [ ] Review visual direction, copy tone, and any design decisions that go beyond the established product brief.

## Phase 6 - Standalone MCP Server

### Agent Tasks

- [ ] Set up the standalone MCP server under `apps/mcp`.
- [ ] Configure the MCP server to import shared database and service-layer code from workspace packages.
- [ ] Implement curated task-shaped MCP tools rather than unrestricted CRUD, including:
- [ ] create listing draft
- [ ] update listing copy
- [ ] set listing location
- [ ] assign listing destinations
- [ ] attach listing images
- [ ] publish listing
- [ ] move listing to trash
- [ ] restore listing from trash
- [ ] add or update destination records as needed
- [ ] add or update region records as needed
- [ ] Ensure MCP writes always set `source = mcp` and populate audit metadata where available.
- [ ] Add robust validation, structured success responses, and clear error handling for tool calls.
- [ ] Add local documentation for how to run the MCP server and how it shares code with the app.
- [ ] Add smoke tests or scripted checks for the highest-value MCP tools.

### Human Required Steps

- [ ] Decide whether the MCP server is strictly local/internal for MVP or needs additional authentication and deployment hardening beyond a trusted internal setup.

## Phase 7 - Content Lifecycle, Trash, and Operational Polish

### Agent Tasks

- [ ] Implement trash-aware queries and restore workflows across shared services.
- [ ] Add status-aware content utilities so draft and published content behavior stays consistent.
- [ ] Add reusable helpers for audit metadata population and update timestamps.
- [ ] Create internal scripts or maintenance commands for common content operations if useful.
- [ ] Add coverage for soft delete, restore, publish, and unpublish behaviors.
- [ ] Verify seeded content, public pages, and MCP tools all respect the same lifecycle rules.
- [ ] Add concise operational documentation for database setup, migrations, seeding, MCP usage, and content-state expectations.

### Human Required Steps

- [ ] Review whether any additional operational safeguards are needed before real content editing begins.

## Deferred Until Later

- [ ] Decide the Cloudflare S3-compatible upload workflow:
- [ ] direct upload from a trusted UI
- [ ] mediated upload through a server process
- [ ] URL-only asset registration workflow
- [ ] Decide whether to add multilingual support in a later phase.
- [ ] Reassess whether SQLite remains sufficient once both the app and MCP server are actively writing content.
