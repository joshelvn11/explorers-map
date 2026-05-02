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
- [x] `create listing draft` now means creating a draft row with required editorial copy and optional best-effort metadata, because the schema now supports sparse draft fields for machine-assisted creation.

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

- [x] MCP `create listing draft` should reuse the Phase 4 shared service semantics, which now allow sparse draft metadata while still requiring listing editorial copy.
- [x] The initial MCP workflow is personal editorial use through ChatGPT, not generic external automation.
- [x] MCP auth should ship in two stages: private API key first, OAuth later.
- [x] MCP creation workflows should be evidence-first and should stop instead of inventing missing facts.
- [x] MCP fuzzy lookup workflows should stop on ambiguity and return candidate matches rather than guessing.
- [x] MCP should allow best-effort sparse drafts for listings and destinations, while still keeping regions strict and evidence-backed.

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
- [x] Require listing editorial copy for MCP draft creation (`title`, `shortDescription`, and `description`), while allowing optional best-effort metadata such as coordinates, category, busyness, and media.
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
- [x] Actions creation flows must remain duplicate-safe and draft-first, while allowing best-effort listing and destination creation when geography is clear.

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
- [x] Remove consequential confirmations from create endpoints so ChatGPT can fire best-effort create requests without an extra confirmation barrier.
- [x] Add HTTP Actions API documentation in `apps/web/API.md`.
- [x] Add root-level `CHATGPT_ACTIONS_CONTEXT.md` guidance for custom GPT usage.
- [x] Add route and integration tests covering auth rejection, schema serving, read/search/get behavior, duplicate-safe create flows, and trash exclusion.

### Human Required Steps

- [ ] Configure the deployed host and bearer token in the custom GPT Actions setup.
- [ ] Review whether this private Actions surface needs additional deployment hardening before broader use.

## Phase 8 - Auth and Access Foundation

Note:

- [x] Better Auth is the planned browser-auth solution for signed-in humans using the web app.
- [x] Browser auth should stay separate from the existing bearer-token auth used by MCP and the Actions API.
- [x] Open signup should create `viewer` users by default.
- [x] The initial browser-auth scope is intentionally narrow: signup, signin, signout, protected sessions, route protection, and shared role checks.
- [x] Password reset and email verification are intentionally deferred until after the core CMS/auth rollout.
- [x] The first admin account should be bootstrapped from environment-backed credentials as a one-time initialization path when no admin exists.
- [x] Browser-driven CMS mutations should prefer one web transport pattern, using thin server actions over shared services rather than a mixed mutation architecture.

### Agent Tasks

- [x] Add Better Auth to `apps/web` with email/password authentication and session handling.
- [x] Add the required auth schema and migration support in the shared SQLite database.
- [x] Keep auth ownership explicit: Better Auth owns auth/session/account tables, while app-owned schema additions carry CMS roles and moderator-region assignments.
- [x] Add the shared auth configuration, session helpers, and server-side current-user lookup needed by the web app.
- [x] Add web auth routes and pages for signup, signin, and signout.
- [x] Add a signed-in account surface for authenticated non-admin users.
- [x] Protect the planned CMS route family so unauthenticated users and non-CMS roles cannot access it.
- [x] Add shared role and actor-context plumbing in `packages/services` so future CMS writes can authorize through shared logic rather than through UI-only checks.
- [x] Add bootstrap-admin initialization using environment-backed credentials when no admin exists yet, and make it idempotent so later env changes do not rewrite an existing admin.
- [x] Add basic signup abuse protection such as rate limiting if practical within the phase, while still deferring CAPTCHA and email verification.
- [x] Add tests for signup, signin, signout, session protection, role gating, and bootstrap-admin idempotency.
- [x] Add tests confirming public anonymous browsing remains unchanged and current MCP/Actions bearer-token auth remains unaffected by browser-session auth.
- [x] Add documentation for the planned browser-auth env vars and role model.

### Human Required Steps

- [x] Choose secure production values for the Better Auth secret and bootstrap-admin credentials.
- [x] Review the signup experience and confirm the viewer-default behavior before broader deployment.

## Phase 9 - CMS Shell and Admin User Management

Note:

- [x] `admin` should have full CMS access and full user-management access.
- [x] `viewer` can authenticate but should have no CMS access in this phase.
- [x] Moderator-region assignment should support one or more assigned regions per moderator.

### Agent Tasks

- [x] Add the protected CMS shell in `apps/web`, including shared navigation, layout, and role-aware entry points.
- [x] Add admin-only user management screens and supporting shared services.
- [x] Implement admin create-user flows.
- [x] Implement admin role-assignment flows for `admin`, `moderator`, and `viewer`.
- [x] Implement moderator-region assignment management.
- [x] Ensure removing or changing moderator role also reconciles moderator-region assignments cleanly.
- [x] Prevent removal or demotion of the last remaining admin.
- [x] Keep first-phase user management non-destructive by avoiding hard delete flows for users.
- [x] Add admin-only create and edit flows for countries and regions.
- [x] Support editable slugs for countries and regions and document that slug changes update canonical URLs immediately without redirect history in v1.
- [x] Keep CMS server actions thin by delegating validation, authorization, and persistence to shared services.
- [x] Ensure admin-managed user changes are attributable to the acting admin through shared audit metadata where supported.
- [x] Add tests for admin-only user management, role changes, moderator-region assignment, and admin-only country/region management.
- [x] Update local and root documentation to describe the planned CMS shell and admin responsibilities.

### Human Required Steps

- [x] Review the CMS information architecture and admin workflows before implementation continues into editorial tooling.

## Phase 10a - Destination Editorial Foundation

This sub-phase establishes moderator-safe destination management. It covers destination audit support, shared RBAC rules, and the first CMS destination create/edit/link flows before any listing editorial UI depends on them.

Note:

- [x] `moderator` can edit destinations when at least one linked destination region overlaps an assigned region.
- [x] `moderator` can create a destination only when at least one linked destination region is a region they manage.
- [x] When a moderator edits destination-region links, they can only attach regions they manage, including when linking an existing destination to one of their managed regions.
- [x] `admin` remains the only role with global content-management access.
- [x] Countries and regions remain admin-managed, while destinations stay non-lifecycle records without draft/published states in this phase.
- [x] Keep browser-auth account and session concerns inside `apps/web`; shared services continue to own CMS authorization, validation, and persistence rather than importing Better Auth into `packages/services`.

### Agent Tasks

- [x] Add the shared schema and migration support needed so destination CMS edits can record acting-user audit attribution before destination edit flows ship.
- [x] Add CMS create and edit flows for destinations with moderator-scoped authorization backed by shared services.
- [x] Ensure moderator destination create flows only present moderator-managed regions as attachable options and reject any attempt to attach unmanaged regions.
- [x] Add moderator flows for linking an existing destination to a region they manage without granting broader destination-region control outside their assigned scope.
- [x] Extend the shared service layer to support RBAC-aware CMS operations for destinations.
- [x] Add shared authorization helpers enforcing admin-only operations and moderator region scoping for destination management.
- [x] Keep Phase 10a web mutations on the same thin server-action pattern established in Phase 9, with `apps/web` handling browser-auth integration and shared services handling authorization plus persistence.
- [x] Ensure moderators may edit a destination only while it retains at least one overlapping assigned region, and restrict moderator destination-region edits to their own assigned regions.
- [x] Support editable slugs for destinations with immediate canonical URL changes and no redirect-history layer in v1.
- [x] Extend audit attribution so CMS edits to destinations record the acting user through shared services.
- [x] Add tests for destination authorization, destination create/edit flows, moderator region-link restrictions, and slug updates.
- [x] Update documentation to describe the Phase 10a destination editorial scope and authorization rules.

### Human Required Steps

- [ ] Review moderator destination permissions and confirm the shared-destination overlap rule is acceptable for v1.

## Phase 10b - Listing Editorial Foundation

This sub-phase introduces the core listing editorial surface. It covers listing create/edit/lifecycle flows, moderator region scoping, and destination selection rules that depend on the destination groundwork from Phase 10a.

Note:

- [x] `moderator` should be able to create, edit, publish, unpublish, trash, and restore listings within assigned regions.
- [x] `moderator` should be able to create a listing only in a region they manage.
- [x] When a moderator assigns destinations to a listing, they should only be able to select destinations that are attached to at least one region they manage.
- [x] Sequence listing work after destinations, because listing editing depends on destination assignment UI and the shared moderator-overlap rules.
- [x] Keep browser-auth account and session concerns inside `apps/web`; shared services should continue to own CMS authorization, validation, and persistence rather than importing Better Auth into `packages/services`.
- [x] Listing parent region stays fixed after creation in Phase 10b; slug edits can change canonical URLs, but listing reparenting is deferred.

### Agent Tasks

- [x] Add CMS create and edit flows for listings, including copy, metadata, location, destination links, and lifecycle controls.
- [x] Extend the shared service layer to support RBAC-aware CMS operations for listings.
- [x] Add shared authorization helpers enforcing moderator region scoping for listing management.
- [x] Ensure moderator listing create and edit flows only present moderator-managed regions as selectable parents and reject any attempt to save a listing into an unmanaged region.
- [x] Ensure moderator listing destination selectors only surface destinations attached to at least one moderator-managed region and reject unmanaged destination assignment server-side.
- [x] Keep Phase 10b web mutations on the same thin server-action pattern established in Phase 9, with `apps/web` handling browser-auth integration and shared services handling authorization plus persistence.
- [x] Ensure moderators cannot manage listings outside assigned regions.
- [x] Ensure moderators cannot perform admin-only actions such as country, region, destination, or user management.
- [x] Support editable slugs for listings with immediate canonical URL changes and no redirect-history layer in v1.
- [x] Extend audit attribution so CMS edits to listings record the acting user through shared services.
- [x] Add tests for listing authorization, listing create/edit flows, region scoping, destination selector scoping, and lifecycle actions.
- [x] Update documentation to describe the Phase 10b listing editorial scope and authorization rules.

### Human Required Steps

- [ ] Review moderator listing permissions and confirm the region-and-destination scoping rules are acceptable for v1.

## Phase 10c - Country Editorial Ownership

This sub-phase expands the CMS permission model above region-scoped moderation. It introduces `country_moderator` as the editorial owner for one or more countries, and it must land before the later listing-polish work so country-level permissions, nested moderator management, and country metadata editing do not have to be retrofitted afterward.

Note:

- [x] `country_moderator` should be a separate role from `moderator`.
- [x] `country_moderator` should be assignable to one or more countries.
- [x] `country_moderator` should be able to edit assigned country records.
- [x] `country_moderator` should be able to create, edit, publish, unpublish, trash, and restore listings in assigned countries.
- [x] `country_moderator` should be able to create and edit regions and destinations in assigned countries.
- [x] `country_moderator` can create and manage country-scoped moderator users within assigned countries, and can create viewer users but viewer accounts remain globally scoped.
- [x] `country_moderator` should not be able to create, manage, promote, or demote `admin` or other `country_moderator` accounts.
- [x] Region moderators managed through this phase should be single-country moderators.
- [x] Keep browser-auth account and session concerns inside `apps/web`; shared services should continue to own CMS authorization, validation, and persistence rather than importing Better Auth into `packages/services`.

### Agent Tasks

- [x] Plan the shared schema changes needed for country-moderator country assignments and any supporting user-management constraints.
- [x] Plan the shared auth and actor-context expansion needed for the `country_moderator` role.
- [x] Plan admin-only user-management updates for assigning one or more countries to `country_moderator` users.
- [x] Plan country-moderator CMS access for editing assigned country metadata without granting global country management.
- [x] Plan country-scoped authorization changes for region create/edit flows.
- [x] Plan country-scoped authorization changes for destination create/edit flows.
- [x] Plan country-scoped authorization changes for listing create/edit/lifecycle flows.
- [x] Plan user-management flows that allow a `country_moderator` to create and manage only `viewer` and `moderator` users within assigned countries.
- [x] Plan enforcement of the single-country moderator rule for moderators managed through this phase.
- [x] Plan tests covering role assignment, country scoping, country-record editing, region/destination/listing permissions, user-management boundaries, and rejection of cross-country moderator assignments.
- [x] Update documentation to describe the planned `country_moderator` role, authority boundaries, and sequencing before implementation begins.

### Human Required Steps

- [ ] Review and confirm the `country_moderator` authority over assigned country records, regions, destinations, listings, and region-level moderator management.
- [ ] Review and confirm the single-country moderator rule for moderators managed through this phase.

## Phase 10d - Listing Media, Tags, and Editorial Polish

This sub-phase rounds out the listing CMS experience. It covers writable tags, ordered image management, and the remaining editorial polish around listing operations after the core listing foundation is stable.

Note:

- [ ] Listing image management remains URL-based and reorderable while the upload workflow is still deferred.
- [ ] Listing tags should become writable in the CMS during this sub-phase.

### Agent Tasks

- [ ] Add listing tag-write support in shared services so the CMS can manage listing tags instead of remaining read-only there.
- [ ] Add CMS support for listing images, including ordered URL-based image management.
- [ ] Expand listing lifecycle controls and editor UX polish around publish, unpublish, trash, and restore flows where needed.
- [ ] Ensure listing image management remains URL-based and reorderable while the upload workflow is still deferred.
- [ ] Add tests for listing tags, image ordering, and remaining lifecycle/editorial polish behaviors.
- [ ] Update documentation to describe the Phase 10d listing media and editorial-polish scope.

## Phase 11 - Content Lifecycle, Trash, and Operational Polish

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

## Phase 12 - MCP OAuth Upgrade

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
