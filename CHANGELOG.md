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
