# Web App Technical Notes

## Purpose

`apps/web` contains the public Next.js application for Explorers Map.

## Current Responsibilities

- App Router pages for public browsing
- Public rendering of countries, regions, destinations, and listings
- SEO metadata generation
- Consumption of shared workspace packages

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
