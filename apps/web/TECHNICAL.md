# Web App Technical Notes

## Purpose

`apps/web` contains the public Next.js application for Explorers Map.

## Current Responsibilities

- App Router pages for public browsing
- Public rendering of countries, regions, destinations, and listings
- SEO metadata generation
- Consumption of shared workspace packages
- URL-driven region catalog filtering backed by shared services

## Shared Package Usage

This app is expected to import shared code from:

- `@explorers-map/db`
- `@explorers-map/services`
- `@explorers-map/utils`

These packages are transpiled via `transpilePackages` in `next.config.ts`.

## Guardrails

- Keep public reads aligned with shared service and schema rules.
- Do not duplicate business write logic in the web layer.
- Listing pages should remain canonically routed under regions.
- Public reads should exclude draft and trashed records by default.
- Destination pages are curated discovery surfaces and should not invent alternate listing parents.

## Route Notes

- `/countries/[countrySlug]/regions/[regionSlug]/listings` is the single interactive catalog surface in MVP.
- Destination pages consume the shared destination listing query and link every card to the canonical region-scoped listing URL.
- Dynamic page metadata is built from shared detail queries for countries, regions, destinations, and listings.
- Static params are generated from shared browse queries, so builds assume migrated and seeded SQLite data.

## Runtime Notes

- The app uses local font stacks instead of `next/font/google` so restricted-network builds do not fail on remote font fetches.
- The production build uses webpack instead of Turbopack so the shared native SQLite dependency works during page-data collection and static generation.
- Remote images are enabled for `picsum.photos` and optionally for the configured Cloudflare public asset host.
