# Web App Technical Notes

## Purpose

`apps/web` contains the public Next.js application for Explorers Map.

## Current Responsibilities

- App Router pages for public browsing
- Public rendering of countries, regions, destinations, and listings
- SEO metadata generation
- Consumption of shared workspace packages
- URL-driven region catalog filtering backed by shared services
- Thin authenticated Actions API route handlers for custom GPT integrations

## Shared Package Usage

This app is expected to import shared code from:

- `@explorers-map/db`
- `@explorers-map/services`
- `@explorers-map/utils`

These packages are transpiled via `transpilePackages` in `next.config.ts`.

## Guardrails

- Keep public reads aligned with shared service and schema rules.
- Do not duplicate business write logic in the web layer.
- Keep the Actions API narrow, auth-protected, OpenAPI-documented, and backed by shared services rather than direct DB writes.
- Listing pages should remain canonically routed under regions.
- Public reads should exclude draft and trashed records by default.
- Destination pages are curated discovery surfaces and should not invent alternate listing parents.

## Route Notes

- `/countries/[countrySlug]/regions/[regionSlug]/listings` is the single interactive catalog surface in MVP.
- Region overview pages now preview both published listings and linked destination pages.
- `/countries/[countrySlug]/regions/[regionSlug]/destinations` shows the full set of destination pages linked to the current region.
- Destination pages consume the shared destination listing query and link every card to the canonical region-scoped listing URL.
- Dynamic page metadata is built from shared detail queries for countries, regions, destinations, and listings.
- Static params are generated from shared browse queries, so builds assume migrated and seeded SQLite data.

## Runtime Notes

- The app uses local font stacks instead of `next/font/google` so restricted-network builds do not fail on remote font fetches.
- The production build uses webpack instead of Turbopack so the shared native SQLite dependency works during page-data collection and static generation.
- Remote images are enabled for `picsum.photos` and optionally for the configured Cloudflare public asset host.
- The Actions API lives under `/api/actions`, uses bearer auth via `EXPLORERS_MAP_ACTIONS_AUTH_TOKEN`, and serves its checked-in contract from `/api/actions/openapi.json`.
- The web app also serves a trimmed production ChatGPT import contract from `/api/actions/openapi.production.json`.
- Actions POST routes return `EnsureResult`-style payloads so custom GPT workflows can distinguish created, matched, candidate-match, and insufficient-evidence outcomes.
- Actions listing reads include drafts by default but exclude trashed listings.
- The web package dev, build, and start scripts auto-load the repo-root `.env` file when it exists.
- Keep both checked-in schema files in sync when editing the Actions contract:
  - `apps/web/openapi/explorers-map-actions.openapi.json`
  - `apps/web/openapi/explorers-map-actions.production.openapi.json`
