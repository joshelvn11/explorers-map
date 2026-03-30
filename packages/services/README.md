# Services Package

This package contains shared domain logic used by both the public app and repository tooling.

## Current Responsibilities

- Shared seed validation, normalization, and import logic for Phase 3
- Future shared read/query modules for the public app
- Future shared write/service modules for MCP and other internal tooling

## Exports

- `@explorers-map/services`
- `@explorers-map/services/seed`

## Local Command

Run this from the repository root:

```bash
pnpm --filter @explorers-map/services typecheck
```
