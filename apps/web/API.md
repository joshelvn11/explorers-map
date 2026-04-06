# Explorers Map Actions API

This document describes the HTTP Actions API implemented inside `apps/web` for private custom GPT and ChatGPT Actions usage.

For the short model-facing routine that minimizes deadlocks, also see `CHATGPT_ACTIONS_OPERATING_PROCEDURE.md` at the repository root.

The runtime serves:

- `GET /api/actions/healthz`
- `GET /api/actions/openapi.json`
- `GET /api/actions/openapi.production.json`
- `GET /api/actions/openapi.draft-only.json`
- `GET` and `POST` endpoints under `/api/actions/v1/...`

## Purpose

This API gives a custom GPT a small OpenAPI-described HTTP surface for:

- reading current countries, categories, regions, destinations, and listings
- searching existing content before writing
- creating new regions, destinations, and listing drafts only when no safe existing match exists

The API is intentionally narrow. It is not broad CRUD.

For autonomous ChatGPT creation workflows, the GPT should be configured with Web Search as well as Actions. The model should gather credible evidence itself when available, but it may still create best-effort destination or listing drafts when the geography is clear and some optional metadata is still missing.

## Authentication

All `/api/actions/v1/...` endpoints require:

```http
Authorization: Bearer <EXPLORERS_MAP_ACTIONS_AUTH_TOKEN>
```

Unauthenticated requests return HTTP `401` with:

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Missing or invalid bearer token."
  }
}
```

`/api/actions/healthz` and `/api/actions/openapi.json` are intentionally unauthenticated.
`/api/actions/openapi.production.json` is also intentionally unauthenticated so it can be imported directly into a custom GPT.
`/api/actions/openapi.draft-only.json` is also intentionally unauthenticated so it can be imported directly into a separate read-only custom GPT.

## Core Rules

- Always list, search, or get existing content before creating anything.
- Regions, destinations, and listings use duplicate-safe ensure flows rather than blind creation.
- Region create still requires non-empty `evidence[]`.
- Destination and listing create flows treat `evidence[]` as recommended rather than required.
- If the user asks for creation without supplying sources, the GPT should gather evidence itself when possible, but it should not stall a listing or destination draft solely because optional evidence or media is missing.
- Region and destination ambiguity still stop with `candidate_matches` instead of guessing.
- Listing create responses may also include advisory `candidates` and non-blocking `warnings` for fuzzy same-region or out-of-scope lookalikes that did not prevent creation.
- New listings are created as `draft` only.
- Listing reads include drafts but exclude trashed content.
- All write logic stays in shared services. Route handlers do not write to the DB directly.

## Endpoint Groups

### Reference

- `GET /api/actions/v1/countries`
- `GET /api/actions/v1/countries/{countrySlug}`
- `GET /api/actions/v1/categories`

### Regions

- `GET /api/actions/v1/countries/{countrySlug}/regions`
- `GET /api/actions/v1/countries/{countrySlug}/regions/search?query=...&limit=...`
- `GET /api/actions/v1/countries/{countrySlug}/regions/{regionSlug}`
- `POST /api/actions/v1/countries/{countrySlug}/regions`

### Destinations

- `GET /api/actions/v1/countries/{countrySlug}/destinations`
- `GET /api/actions/v1/countries/{countrySlug}/destinations/search?query=...&regionSlug=...&limit=...`
- `GET /api/actions/v1/countries/{countrySlug}/destinations/{destinationSlug}`
- `POST /api/actions/v1/countries/{countrySlug}/destinations`

### Listings

- `GET /api/actions/v1/countries/{countrySlug}/regions/{regionSlug}/listings`
- `GET /api/actions/v1/countries/{countrySlug}/destinations/{destinationSlug}/listings`
- `GET /api/actions/v1/countries/{countrySlug}/listings/search?query=...&regionSlug=...&destinationSlug=...&latitude=...&longitude=...&limit=...`
- `GET /api/actions/v1/countries/{countrySlug}/regions/{regionSlug}/listings/{listingSlug}`
- `POST /api/actions/v1/countries/{countrySlug}/regions/{regionSlug}/listings`

## Create Response Shape

All create endpoints return ensure-style payloads:

```json
{
  "status": "matched | created | candidate_matches | insufficient_evidence",
  "confidence": 0.98,
  "reasons": ["..."],
  "record": {},
  "candidates": [],
  "evidence": [],
  "warnings": []
}
```

Response semantics:

- HTTP `201` when `status = "created"`
- HTTP `200` when a record was matched, or when creation stopped safely because of candidate matches or insufficient evidence

Recommended `evidence[]` example when the GPT has sources available:

```json
[
  {
    "label": "Official tourism page",
    "note": "Confirmed the place name and regional location.",
    "url": "https://example.com/place"
  }
]
```

## Recommended GPT Workflow

1. Call `listCountries` and `listCategories` when you need canonical slugs.
2. Use search and get endpoints to inspect current regions, destinations, and listings.
3. For new regions, call the matching `POST` ensure endpoint with `evidence[]`.
4. For new destinations or listings, call the matching `POST` ensure endpoint as soon as the geography is clear and the required copy fields are ready, even if optional metadata is still missing.
5. Omit optional destination or listing fields you still cannot verify instead of stalling or inventing them.
6. If a region or destination create returns `candidate_matches`, stop and review candidates instead of retrying with a slightly different title.
7. For listings, reuse exact matches, but treat fuzzy `candidates` or `warnings` on successful creates as advisory review notes.
8. If a listing create succeeds with advisory `candidates` or `warnings`, treat them as review notes rather than as a failed write.
9. Treat listing creation as draft-only. There are no publish or trash endpoints in this phase.

## OpenAPI

- Checked-in contract:
  `apps/web/openapi/explorers-map-actions.openapi.json`
- Checked-in production GPT contract:
  `apps/web/openapi/explorers-map-actions.production.openapi.json`
- Checked-in draft-only GPT contract:
  `apps/web/openapi/explorers-map-actions.draft-only.openapi.json`
- Served contract:
  `GET /api/actions/openapi.json`
- Served production GPT contract:
  `GET /api/actions/openapi.production.json`
- Served draft-only GPT contract:
  `GET /api/actions/openapi.draft-only.json`

Schema intent:

- `explorers-map-actions.openapi.json`
  Full local/runtime contract, including utility endpoints such as health and schema discovery.
- `explorers-map-actions.production.openapi.json`
  Trimmed ChatGPT-facing contract for live import on `https://explorersmap.org`, omitting utility endpoints so the GPT only sees editorial actions.
- `explorers-map-actions.draft-only.openapi.json`
  Trimmed read-only ChatGPT-facing contract for live import on `https://explorersmap.org`, exposing only `GET` operations for countries, categories, regions, destinations, and listings.

Maintenance rule:

- Future Actions contract changes must be reflected in all checked-in schema files and all served schema routes.
