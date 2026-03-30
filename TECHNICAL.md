# Technical Notes

## Workspace Structure

This repository is organized as a pnpm workspace.

- `apps/web` contains the Next.js public application.
- `apps/mcp` contains the standalone MCP server.
- `packages/db` is intended to own SQLite and Drizzle concerns.
- `packages/services` is intended to own shared read/write domain logic.
- `packages/utils` is intended to own shared helpers.

## Shared Package Intent

The architectural goal is to keep business rules centralized in shared packages rather than duplicating logic across runtime entrypoints.

Expected flow:

1. `apps/web` imports shared read/query logic from workspace packages.
2. `apps/mcp` imports shared write/service logic from workspace packages.
3. Both runtime entrypoints depend on the same schema and domain rules.

## Current State

- The workspace root is configured.
- `apps/web` is wired to resolve shared workspace packages.
- Shared package directories currently contain placeholder exports and are ready for implementation work in later phases.

## Notes for Future Agents

- Prefer package imports such as `@explorers-map/db` and `@explorers-map/services` over deep relative imports.
- When adding new shared modules, expose them through the relevant package manifest.
- Keep Next.js transpilation settings aligned with any shared package usage in `apps/web`.
