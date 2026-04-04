# DB Package

This package contains the shared SQLite client, Drizzle schema, and migrations used across the workspace.

## Responsibilities

- Define the shared relational schema for MVP content
- Plan for upcoming auth-related schema owned in the same SQLite database
- Plan for moderator-region scoping tables needed by the future CMS
- Export the shared DB client used by workspace runtimes
- Store generated migrations under `packages/db/migrations`

## Exports

- `@explorers-map/db`
- `@explorers-map/db/client`
- `@explorers-map/db/schema`

## Local Commands

Run these from the repository root:

```bash
pnpm db:generate
pnpm db:migrate
pnpm --filter @explorers-map/db typecheck
```

## Environment

- `EXPLORERS_MAP_SQLITE_PATH`
  Optional override for the SQLite file path. Defaults to `.data/explorers-map.sqlite` at the workspace root.
