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
- Added `CHATGPT_MCP_CONTEXT.md` with reusable platform, editorial, and data-model instructions for future ChatGPT-driven MCP usage.

### Changed

- Refined the MCP plan around personal editorial use through ChatGPT rather than generic CRUD automation.
- Updated the MCP implementation plan to emphasize fuzzy lookup, lookup-before-create flows, destination ensuring, and draft-first content creation.
- Split the MCP authentication plan into two stages: private API key first for MVP and OAuth later for the proper remote ChatGPT connector phase.
