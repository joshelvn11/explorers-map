# MCP App

This directory contains the standalone Explorers Map MCP server.

The server is the primary machine-write interface for editorial content operations and reuses the shared service layer in `packages/services` instead of introducing a separate write path.

## Getting Started

From the repository root:

```bash
pnpm dev:mcp
```

Or from inside this directory:

```bash
pnpm dev
```

The dev and start scripts automatically load the repo-root `.env` file when it exists.

Required environment:

- `EXPLORERS_MAP_MCP_AUTH_TOKEN`
  Required bearer token for all `/mcp` requests.
- `EXPLORERS_MAP_MCP_HOST`
  Bind host. Defaults to `127.0.0.1`.
- `EXPLORERS_MAP_MCP_PORT`
  Bind port. Defaults to `3001`.

Health check:

- `GET /healthz`

MCP endpoint:

- `POST /mcp`

Auth header:

```http
Authorization: Bearer <EXPLORERS_MAP_MCP_AUTH_TOKEN>
```

## Current Responsibilities

- expose task-shaped editorial MCP tools for categories, regions, destinations, and listings
- prefer lookup-before-create flows over blind creation
- require evidence for new records and other new factual claims
- stop on fuzzy ambiguity by returning candidate matches instead of guessing
- default new listings to `draft`
- expose read-only context resources backed by the repo docs
- reuse shared service-layer writes rather than introducing a second write path

## Local Commands

```bash
pnpm dev
pnpm start
pnpm typecheck
pnpm test
```

## Key Documents

- `API.md`
  MCP resources, tool contracts, auth behavior, and editorial workflow reference.
- `TECHNICAL.md`
  Local runtime notes, transport details, and implementation guardrails.
- `../../CHATGPT_MCP_CONTEXT.md`
  Baseline editorial instructions for ChatGPT when connected to this MCP.
