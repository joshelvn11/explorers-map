# Web App

This directory contains the Next.js public application for Explorers Map.

## Getting Started

From the repository root, run:

```bash
pnpm dev:web
```

Or, from inside this directory:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The web app dev, build, and start scripts automatically load the repo-root `.env` file when it exists.

## Scope

- Public browsing UI
- App Router pages
- SEO metadata
- Read-first MVP presentation layer
- Region catalog filtering via shared services
- Narrow authenticated HTTP Actions API for private custom GPT integrations

## Shared Workspace Packages

This app is expected to consume shared packages from the repository workspace:

- `@explorers-map/db`
- `@explorers-map/services`
- `@explorers-map/utils`

Shared packages are transpiled through Next.js so they can be imported directly from the monorepo.

## Notes

- Keep public content reads aligned with the shared service and data-model rules in the root brief.
- Do not introduce write-specific business logic here that belongs in shared services or MCP tools.
- The Actions API under `/api/actions` is an exception to the earlier no-Next.js-API assumption, but it must stay thin and delegate all domain logic to shared services.
- The public route tree now includes:
  - `/`
  - `/countries`
  - `/countries/[countrySlug]`
  - `/countries/[countrySlug]/regions`
  - `/countries/[countrySlug]/regions/[regionSlug]`
  - `/countries/[countrySlug]/regions/[regionSlug]/destinations`
  - `/countries/[countrySlug]/regions/[regionSlug]/listings`
  - `/countries/[countrySlug]/regions/[regionSlug]/[listingSlug]`
  - `/countries/[countrySlug]/destinations`
  - `/countries/[countrySlug]/destinations/[destinationSlug]`
- The machine-facing Actions route tree now includes:
  - `/api/actions/healthz`
  - `/api/actions/openapi.json`
  - `/api/actions/openapi.production.json`
  - `/api/actions/v1/...`
- Build and dev flows expect the shared SQLite database to be migrated and seeded first because static params and page rendering read real content from shared services.
- The production build script uses `next build --webpack` so the shared native SQLite dependency stays compatible with Next's build pipeline.
- Remote images are configured for `picsum.photos` and an optional Cloudflare public asset base URL.
- The Actions API expects `EXPLORERS_MAP_ACTIONS_AUTH_TOKEN` to be set before use.

## Key Documents

- `API.md`
  HTTP Actions endpoint reference, auth behavior, payloads, and GPT workflow guidance.
- `openapi/explorers-map-actions.openapi.json`
  Full local/runtime Actions contract, including utility endpoints.
- `openapi/explorers-map-actions.production.openapi.json`
  Trimmed production ChatGPT import contract for `https://explorersmap.org`.
