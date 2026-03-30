# MCP App Technical Notes

## Purpose

`apps/mcp` is reserved for the standalone MCP server.

## Intended Responsibilities

- Expose curated task-shaped MCP tools
- Reuse shared write logic from `packages/services`
- Reuse shared schema and database access from `packages/db`
- Act as the primary machine-write interface for content operations

## Guardrails

- Do not implement a second source of truth for write logic here.
- Prefer task-shaped tools over unrestricted CRUD.
- Keep audit metadata and source tracking consistent with shared service rules.
- Avoid raw database writes that bypass the shared service layer unless the brief is explicitly changed.
