# MCP App

This directory is reserved for the standalone Explorers Map MCP server.

The MCP server is intended to become the primary machine-write interface for editorial content operations while reusing shared logic from `packages/db` and `packages/services`.

## Current Status

The runtime implementation is still pending. This directory currently documents the planned Phase 6 MCP surface so future implementation work follows a single agreed contract.

## Planned Responsibilities

- expose task-shaped editorial MCP tools for regions, destinations, and listings
- prefer lookup-before-create flows over blind creation
- require evidence for new factual claims and new records
- stop on ambiguous matches instead of guessing
- default new content to `draft`
- reuse shared service-layer writes rather than introducing a second write path

## Key Documents

- `API.md`
  Detailed planned MCP tool and schema reference.
- `TECHNICAL.md`
  Local architecture notes and implementation guardrails for the future server.
- `../../CHATGPT_MCP_CONTEXT.md`
  Baseline instructions for how ChatGPT should behave when connected to this MCP.
