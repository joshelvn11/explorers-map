# Explorers Map Agent Guide

This file is the primary working guide for AI agents contributing to this repository. It provides project context, implementation guardrails, and documentation rules.

## Project Context

Explorers Map is a visual, curated discovery app for outdoor and nature-focused places.

Current product direction is documented in:

- `BRIEF.md`
  Product scope, architecture direction, data model, and core decisions.
- `IMPLEMENTATION_PLAN.md`
  Phase-by-phase implementation checklist for agent execution with human review.
- `seed-data/`
  Early seed content and validation utilities.

When working in this repository:

- Treat `BRIEF.md` as the source of truth for product and architecture decisions.
- Treat `IMPLEMENTATION_PLAN.md` as the source of truth for sequencing and execution.
- Do not introduce architectural patterns that conflict with the brief without updating the brief first.

## Current Architecture Direction

This project is currently a single repository. The intended implementation shape is:

- `apps/web`
  Next.js public app.
- `apps/mcp`
  Standalone MCP server for machine-driven content operations.
- `packages/db`
  Shared Drizzle schema, SQLite client, and migrations.
- `packages/services`
  Shared read/write domain logic used by both the web app and MCP server.
- `packages/utils`
  Shared helpers.

Important architectural rules:

- The public web app is read-first for MVP.
- No dedicated Next.js CRUD API is required for MVP.
- The MCP server is the primary machine-write interface for content operations.
- Shared service-layer functions are the single write path for MCP tools and scripts.
- The app and MCP server should share code through workspace packages, not duplicate business logic.
- SQLite is the chosen database for MVP.
- Cloudflare S3-compatible object storage is the chosen production image host.
- Upload strategy for Cloudflare object storage is still deferred.

## Product and Data Model Guardrails

Unless the brief is explicitly updated, agents should preserve these decisions:

- Listings belong to one required `Region`.
- Listings may belong to zero or more `Destinations`.
- Destination pages show only listings explicitly linked to that destination.
- Listing pages are canonically routed under regions.
- Listings support `draft` and `published` states.
- Listings use soft delete to trash via `deletedAt`.
- Public queries should exclude draft and trashed content by default.
- `latitude` and `longitude` are the source of truth for map behavior.
- `googleMapsPlaceUrl` is optional supplemental metadata.
- `busynessRating` is curated editorial metadata on a `1` to `5` scale.
- Categories are fixed and curated.
- Tags are flexible.
- Multilingual support is out of scope for MVP.

## Agent Priorities

When implementing features, optimize for this order:

1. Respect the brief and implementation plan.
2. Keep writes and validation centralized in shared services.
3. Preserve consistent data model behavior across app, seed scripts, and MCP tools.
4. Keep the MVP lean. Avoid speculative abstractions unless they clearly reduce churn.
5. Leave the codebase easier for the next agent or human to understand.

## Documentation Hygiene

Documentation hygiene is mandatory after any code change.

Whenever you modify, add, or remove code in this workspace, you MUST evaluate whether documentation changes are required.

### Documentation Files and Intent

#### Root `README.md`

- Audience:
  Developers who need high-level setup, workspace usage guidance, and a system-level map of the repository.
- Update when:
  Setup steps, install commands, workspace commands, high-level architecture, top-level directory structure, or cross-package usage guidance changes.
- Do not put:
  Deep implementation details or package-specific design reasoning.

#### Local `README.md` files inside apps or packages

- Audience:
  Developers or agents working within a specific app or package.
- Update when:
  Setup, usage, commands, entrypoints, or local responsibilities change for that directory.
- Scope:
  Keep these docs local to the app or package they describe.
- Examples:
  - `apps/web/README.md`
  - `apps/mcp/README.md`
  - `packages/db/README.md`

#### Root `TECHNICAL.md`

- Audience:
  Contributors and future agents who need repository-wide implementation context.
- Update when:
  Cross-app logic, shared data flows, schema behavior, service-layer rules, MCP architecture, or other repository-wide design decisions change.
- Include when relevant:
  - Context
  - Implementation
  - Data flow
  - Dependencies
  - Failure modes or edge cases

#### Local `TECHNICAL.md` files inside apps or packages

- Audience:
  Contributors and agents working on a specific app or package.
- Update when:
  Internal implementation details for that directory change.
- Scope:
  Document local mechanics, assumptions, data flow, and failure modes for that app or package without repeating repository-wide context unnecessarily.
- Examples:
  - `apps/web/TECHNICAL.md`
  - `apps/mcp/TECHNICAL.md`
  - `packages/services/TECHNICAL.md`

#### `CHANGELOG.md`

- Audience:
  Anyone tracking meaningful progress in the project.
- Update when:
  A distinct feature, fix, or behavior change is completed.
- Format:
  Keep a Changelog style with clear human-readable entries.

#### `.env.example`

- Audience:
  Developers configuring local environments.
- Update when:
  Environment variables are added, removed, or renamed.
- Never include:
  Real secrets.

#### `API.md` or equivalent API/MCP reference

- Audience:
  Developers or agents integrating with exposed interfaces.
- Update when:
  Public-facing API routes, MCP tool contracts, request/response shapes, or invocation expectations change.
- Note:
  This project may not need traditional HTTP API docs for MVP, but MCP tool documentation should still be kept accurate once it exists.

#### `TODO.md`

- Audience:
  Future agents and developers planning follow-up work.
- Update when:
  You leave behind a workaround, known limitation, deferred hardening item, or actionable debt.
- Entry style:
  Use actionable tags such as `[TECH DEBT]`, `[FEATURE]`, `[SECURITY]`, or `[PERFORMANCE]`.

### Documentation Granularity Standard

- Pure formatting or lint-only changes:
  No documentation update required.
- Minor internal refactors:
  Usually `TECHNICAL.md` only, if behavior or internal understanding changed.
- New feature:
  Usually `README.md`, `TECHNICAL.md`, and `CHANGELOG.md`.
- Breaking change:
  Update every affected document and note migration impact.

When in doubt, document in `TECHNICAL.md`.

### Repository and Directory Documentation Scope

This is a single repository with multiple apps and shared packages.

- Root-level documentation should explain the overall system, shared architecture, and workspace-level setup.
- Each app or package should maintain its own `README.md` and `TECHNICAL.md` once that directory has meaningful implementation detail.
- When changing code inside a specific app or package, prefer updating the most local relevant docs first.
- Update root docs as well when the change affects the wider repository, cross-package contracts, or the top-level directory map.
- Do not copy the same implementation detail into multiple files unless there is a clear audience reason.

### Required Documentation Check

After any code change, explicitly evaluate each relevant documentation file:

- Did the root `README.md` change? Yes or no.
- Did the root `TECHNICAL.md` change? Yes or no.
- Did the local `README.md` for the affected app or package change? Yes or no.
- Did the local `TECHNICAL.md` for the affected app or package change? Yes or no.
- Did `CHANGELOG.md` change? Yes or no.
- Did `.env.example` change? Yes or no.
- Did `API.md` or MCP interface documentation change? Yes or no.
- Did `TODO.md` change? Yes or no.
- If yes, update it in the same task when practical.
- If no, leave it unchanged.

Do not skip this evaluation.

## Change Impact Awareness

Before finalizing any code change, consider:

- Downstream callers
- Upstream dependencies
- Shared types and schemas
- Environment variables
- Seed data compatibility
- MCP tool contracts
- Migration impact

If any of these change, update the relevant documentation and implementation notes.

## Working With Seed Data

The current seed content is an early curated dataset and should be treated as a development asset, not as production-ready truth.

- Keep the seed validator runnable.
- Keep relationships, required fields, and warnings accurate.
- Preserve placeholder image support until the real image workflow is defined.
- When schema changes affect seed content, update the seed source and validation in the same task.

## Working With MCP

When implementing MCP functionality:

- Prefer task-shaped tools over unrestricted CRUD.
- Reuse shared service functions for writes.
- Keep tool validation strict and responses structured.
- Track source and audit metadata consistently.
- Do not bypass the shared service layer with raw DB writes unless the brief is explicitly changed.

## Working With Content Lifecycle

Unless otherwise specified:

- Public content reads return published, non-trashed records only.
- MCP and internal tools may operate on draft and trashed records when the task requires it.
- Soft delete means moving records to trash, not permanently deleting them by default.

## Execution Expectations

When carrying out work:

- Read the brief and implementation plan before making significant changes.
- Keep `IMPLEMENTATION_PLAN.md` updated as work progresses by ticking off completed items that are fully done.
- If implementation reveals that the plan should change, you may update `IMPLEMENTATION_PLAN.md` to improve sequencing, add missing tasks, remove obsolete tasks, or clarify ambiguous work.
- When changing the implementation plan, preserve the intent of the brief and briefly explain the reason for the plan change in your final summary.
- Prefer completing tasks end-to-end, including tests and documentation, rather than stopping at partial implementation.
- If the repository structure diverges from the planned shape, reconcile the difference carefully instead of forcing a blind rewrite.
- If a decision is ambiguous and has architectural impact, pause and ask for clarification.
- If a decision is minor and low-risk, make a reasonable choice and document it.
