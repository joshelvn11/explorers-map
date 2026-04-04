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

- [x] MCP `create listing draft` should reuse the Phase 4 shared service semantics, which create a complete draft listing rather than a sparse placeholder row.
- [x] The initial MCP workflow is personal editorial use through ChatGPT, not generic external automation.
- [x] MCP auth should ship in two stages: private API key first, OAuth later.
- [x] MCP creation workflows should be evidence-first and should stop instead of inventing missing facts.
- [x] MCP fuzzy lookup workflows should stop on ambiguity and return candidate matches rather than guessing.
- [x] MCP should not support placeholder-only drafts in MVP because the current listing schema requires a complete draft row.

### Agent Tasks

- [x] Set up the standalone MCP server under `apps/mcp`.
- [x] Configure the MCP server to import shared database and service-layer code from workspace packages.
- [x] Add the shared service-layer support the MCP surface needs before wiring handlers:
- [x] `createRegion`
- [x] `createDestination`
- [x] `assignDestinationRegions`
- [x] editor-visible region and destination detail helpers if the current public reads are too narrow for MCP workflows
- [x] shared fuzzy matching helpers for regions, destinations, and listings with consistent scoring and candidate output
- [x] Implement curated task-shaped MCP tools rather than unrestricted CRUD, including:
- [x] `list_categories`
- [x] `list_regions`
- [x] fuzzy `find_region`
- [x] `get_region`
- [x] `ensure_region` so ChatGPT can reuse an existing region or create one only when needed
- [x] `create_region`
- [x] `list_destinations`
- [x] fuzzy `find_destination`
- [x] `get_destination`
- [x] `ensure_destination` so ChatGPT can reuse an existing destination or create one only when needed
- [x] `create_destination`
- [x] `assign_destination_regions`
- [x] `list_listings` scoped to a region or destination
- [x] fuzzy `find_listing`
- [x] `get_listing`
- [x] `ensure_listing` so ChatGPT can reuse or flag likely existing listings before creating a new draft
- [x] `create_listing_draft`
- [x] `update_listing_copy`
- [x] `update_listing_metadata`
- [x] `set_listing_location`
- [x] `assign_listing_destinations`
- [x] `attach_listing_images`
- [x] `publish_listing`
- [x] `move_listing_to_trash`
- [x] `restore_listing_from_trash`
- [x] Prefer lookup-and-improve flows over blind creation so ChatGPT checks for existing regions, destinations, and listings before creating new records.
- [x] Implement fuzzy matching for destination, region, and listing reads so slight naming differences still resolve to likely existing records.
- [x] Return structured match confidence or equivalent signals from fuzzy lookups so the assistant can avoid duplicate creation.
- [x] Ensure region and destination creation flows return existing-match information or explicit creation outcomes so ChatGPT can avoid duplicate records.
- [x] Ensure listing matching considers region scope, likely title similarity, and location evidence where available before creating new drafts.
- [x] Require non-empty structured `evidence[]` input for tools that create records or introduce new factual claims, validate it, and echo it back in structured responses without persisting it yet.
- [x] Accept optional explicit slugs on create and ensure tools, but if a slug is omitted derive it from the title and reject collisions rather than silently suffixing them.
- [x] Require complete listing-draft payloads for MCP creation, including `categorySlug`, coordinates, `busynessRating`, `coverImage`, `shortDescription`, and `description`.
- [x] Ensure write tools default to draft behavior unless the user explicitly requests publish behavior.
- [x] Ensure MCP writes always set `source = mcp` and populate audit metadata where available.
- [x] Add simple private MCP authentication for MVP using a bearer token or API key.
- [x] Store the MVP MCP secret in environment configuration rather than hard-coding it.
- [x] Reject unauthenticated MCP requests and document the expected auth header format.
- [x] Add robust validation, structured success responses, and clear error handling for tool calls.
- [x] Add a small read-only context surface for ChatGPT, such as platform guide, data model guide, and editorial rules resources.
- [x] Ensure fuzzy lookups and ensure tools follow the documented `MatchCandidate`, `FindResult`, `EnsureResult`, and `MutationResult` contracts.
- [ ] Defer vague orchestration tools such as `improve_region_listings` and `improve_destination_listings` until they can be specified as explicit evidence-driven workflows.
- [x] Add and maintain a repository document that can be used as baseline ChatGPT MCP context instructions.
- [x] Add local documentation for how to run the MCP server and how it shares code with the app.
- [x] Add a dedicated `apps/mcp/API.md` reference describing the planned MCP resources, tool contracts, shared schemas, error behavior, and example editorial workflows.
- [x] Add smoke tests or scripted checks for the highest-value MCP tools, including fuzzy matching, ambiguity-stop behavior, evidence validation, duplicate protection, auth rejection, and structured error responses.

### Human Required Steps

- [x] Decide whether the MCP server is strictly local/internal for MVP or needs additional authentication and deployment hardening beyond a trusted internal setup.

## Phase 7 - Actions HTTP API for Custom GPT

Note:

- [x] This phase is a deliberate exception to the earlier “no dedicated Next.js CRUD API” wording. The web app remains public/read-first, but now also hosts a narrow authenticated machine-facing Actions surface under `apps/web`.
- [x] The Actions API is intended for private custom GPT and ChatGPT Actions use, not for broad public CRUD.
- [x] The Actions API must stay a thin adapter over shared services and must not introduce direct DB writes in route handlers.
- [x] Actions reads default to editor-visible draft inclusion while excluding trashed listings.
- [x] Actions creation flows must remain duplicate-safe, evidence-first, and draft-first.

### Agent Tasks

- [x] Add an authenticated Actions API namespace under `apps/web/app/api/actions`.
- [x] Add `GET /api/actions/healthz`.
- [x] Add `GET /api/actions/openapi.json`.
- [x] Add `GET /api/actions/v1/countries`.
- [x] Add `GET /api/actions/v1/countries/[countrySlug]`.
- [x] Add `GET /api/actions/v1/categories`.
- [x] Add region endpoints for list, search, get, and duplicate-safe create.
- [x] Add destination endpoints for list, search, get, and duplicate-safe create.
- [x] Add listing endpoints for region list, destination list, search, get, and duplicate-safe draft create.
- [x] Keep route handlers thin and route all business behavior through existing shared services.
- [x] Add separate bearer-token auth for the Actions API.
- [x] Reuse existing fuzzy matching, ensure flows, evidence rules, and draft-only listing creation semantics.
- [x] Add a checked-in OpenAPI 3.1 schema at `apps/web/openapi/explorers-map-actions.openapi.json`.
- [x] Serve the same Actions contract from `/api/actions/openapi.json`.
- [x] Mark mutating endpoints as consequential in the OpenAPI contract.
- [x] Add HTTP Actions API documentation in `apps/web/API.md`.
- [x] Add root-level `CHATGPT_ACTIONS_CONTEXT.md` guidance for custom GPT usage.
- [x] Add route and integration tests covering auth rejection, schema serving, read/search/get behavior, duplicate-safe create flows, and trash exclusion.

### Human Required Steps

- [ ] Configure the deployed host and bearer token in the custom GPT Actions setup.
- [ ] Review whether this private Actions surface needs additional deployment hardening before broader use.

## Phase 8 - Content Lifecycle, Trash, and Operational Polish

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

## Phase 9 - MCP OAuth Upgrade

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
