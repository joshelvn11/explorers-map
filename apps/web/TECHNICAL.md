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
- Better Auth browser-session handling
- Signed-in account routes and a protected CMS shell
- Thin CMS server actions plus admin-only CMS screens for users, countries, and regions, and shared listing and destination screens for admins and moderators

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
- Keep the planned CMS thin as well: auth/session handling can live here, but CMS validation, authorization, and writes should live in shared services.
- Planned CMS writes should standardize on thin server actions rather than mixing multiple mutation patterns unless a later requirement clearly forces an exception.
- Listing pages should remain canonically routed under regions.
- Public reads should exclude draft and trashed records by default.
- Destination pages are curated discovery surfaces and should not invent alternate listing parents.

## Route Notes

- `/countries/[countrySlug]/regions/[regionSlug]/listings` is the single interactive catalog surface in MVP.
- Region overview pages now preview both published listings and linked destination pages.
- `/countries/[countrySlug]/regions/[regionSlug]/destinations` shows the full set of destination pages linked to the current region.
- Destination pages consume the shared destination listing query and link every card to the canonical region-scoped listing URL.
- Dynamic page metadata is built from shared detail queries for countries, regions, destinations, and listings.
- DB-backed public pages now use `dynamic = "force-dynamic"` so page content and metadata are read from the live runtime database instead of from build-time static params.
- Browser-auth route families now include `/sign-in`, `/sign-up`, `/sign-out`, `/account`, and `/cms`.
- `/cms` is now gated by session and role while public browse routes remain unaffected.
- Phase 9 adds a CMS shell layout with role-aware navigation plus admin-only `/cms/users`, `/cms/countries`, and `/cms/regions` route families.
- A dedicated admin guard now redirects moderators away from the Phase 9 admin-only pages back to `/cms`.
- Phase 10b adds `/cms/listings`, `/cms/listings/new`, and `/cms/listings/[countrySlug]/[regionSlug]/[listingSlug]` outside the admin-only route group so moderators can use them too.
- Phase 10a adds `/cms/destinations`, `/cms/destinations/new`, and `/cms/destinations/[countrySlug]/[destinationSlug]` outside the admin-only route group so moderators can use them too.
- Out-of-scope moderator listing detail requests redirect back to `/cms/listings` instead of rendering a raw forbidden page.
- Out-of-scope moderator destination detail requests redirect back to `/cms/destinations` instead of rendering a raw forbidden page.

## Runtime Notes

- The app uses local font stacks instead of `next/font/google` so restricted-network builds do not fail on remote font fetches.
- The production build uses webpack instead of Turbopack so the shared native SQLite dependency works during page-data collection and static generation.
- Remote images are enabled for `picsum.photos` and optionally for the configured Cloudflare public asset host.
- The Actions API lives under `/api/actions`, uses bearer auth via `EXPLORERS_MAP_ACTIONS_AUTH_TOKEN`, and serves its checked-in contract from `/api/actions/openapi.json`.
- Browser auth now uses Better Auth session cookies and remains separate from the existing bearer-token Actions auth.
- Public browse routes should remain anonymous and continue working even after CMS session auth is added.
- The web app also serves a trimmed production ChatGPT import contract from `/api/actions/openapi.production.json`.
- Each Actions route exports direct `runtime = "nodejs"` and `dynamic = "force-dynamic"` literals so Next.js 16 accepts the route segment config during production builds.
- Actions POST routes return `EnsureResult`-style payloads so custom GPT workflows can distinguish created, matched, candidate-match, and insufficient-evidence outcomes.
- Actions listing reads include drafts by default but exclude trashed listings.
- The checked-in Actions context and OpenAPI descriptions now explicitly instruct GPTs to self-source credible evidence with Web Search when that capability is enabled, while still allowing best-effort listing and destination creates when optional metadata is missing.
- The repository-level `CHATGPT_ACTIONS_OPERATING_PROCEDURE.md` provides the shorter model-facing operating routine intended to reduce hesitation before valid create calls.
- Actions create endpoints no longer use OpenAPI consequential confirmations, which reduces ChatGPT hesitation before firing duplicate-safe create requests.
- Destination pages and destination cards now tolerate missing `coverImage` values so sparse destination records can still render safely in the public app and CMS.
- The web package dev, build, and start scripts auto-load the repo-root `.env` file when it exists.
- The web package dev script now also runs `pnpm db:migrate` and `pnpm auth:bootstrap-admin` before handing off to Next.js so local auth routes do not boot against stale SQLite schemas.
- The root `docker:start:web` bootstrap flow runs migrations, seeds only on an empty database, and then starts the app on `0.0.0.0:3000` for container deployment.
- Better Auth env vars plus bootstrap-admin env vars are now loaded into the same runtime.
- The footer build marker is server-rendered from `lib/build-info.ts`; Docker images generate `.build-info.json` during the image build, while local dev falls back to a simple `local-dev` label.
- The bootstrap-admin flow now runs from a dedicated initialization path, stays idempotent, and never evaluates on ordinary requests.
- `/api/auth/[...all]` now resolves Better Auth lazily at request time instead of constructing it at module import time, while `createAuth({ enableNextCookies: false })` is still used in non-request bootstrap and test contexts.
- `proxy.ts` only performs optimistic cookie checks for `/account` and `/cms`; authoritative session and role gating still happens in server helpers used by the protected pages and layouts.
- Browser-auth signup currently defaults every new user to an app-owned `viewer` role via Better Auth database hooks.
- The account page is available to any signed-in user, while the CMS shell currently allows only `admin` and `moderator`.
- Phase 9 user creation stays web-owned because Better Auth lives in `apps/web`; the CMS uses a small auth adapter there to create the browser-auth account and then immediately hands role and moderator-assignment persistence to shared services.
- CMS mutations now use thin server actions under `app/cms/actions.ts`, while shared services own authorization, slug validation, last-admin protection, and country/region persistence.
- Phase 10a destination mutations follow the same pattern through a dedicated `lib/cms-destinations.ts` helper, with shared services now owning destination RBAC, audit stamping, slug updates, and moderator-scoped destination-region merge behavior.
- Phase 10b listing mutations follow the same pattern through `lib/cms-listings.ts`, with shared services now owning listing RBAC, audit stamping, lifecycle transitions, slug updates, and moderator-scoped destination merge behavior.
- Listing edit pages keep the parent region read-only in this phase; region selection is only available at listing creation time.
- Production builds may run without `BETTER_AUTH_SECRET` present because the auth layer now uses a build-only placeholder secret during `next build`; the real secret is still mandatory in the running production container.
- Keep both checked-in schema files in sync when editing the Actions contract:
  - `apps/web/openapi/explorers-map-actions.openapi.json`
  - `apps/web/openapi/explorers-map-actions.production.openapi.json`
