# Explorers Map — Product Brief

## Overview

Explorers Map is a simple, visual web app designed to help people discover nature-focused places to explore. It acts as a curated directory of outdoor locations — from beaches and forests to hiking trails, parks, and scenic spots — all organized in a way that makes browsing intuitive and enjoyable.

The goal is to make it easy for anyone to find new places to visit, whether they’re planning a trip or just looking for inspiration nearby.

---

## The Core Idea

At its heart, Explorers Map is about **structured discovery**.

Instead of relying on search alone, users navigate through a clear hierarchy:

- Start with a **country**
- Explore by **region** (like a state or county) or by **destination** (a named area such as Jurassic Coast or Peak District National Park)
- Browse a collection of **places**
- View detailed information about each location

This creates a natural, exploratory experience — similar to browsing a map or travel guide.

---

## What Users Can Do

- Browse countries and regions visually
- Browse named destinations within a country
- Discover nature spots within a specific area
- View detailed information about each location
- Explore places through images, descriptions, and categories
- Quickly open locations in Google Maps for directions

---

## Types of Places Included

Explorers Map focuses specifically on outdoor and nature-based locations, including:

- Beaches
- Forests
- Hiking trails
- Mountains
- Parks
- Lakes and rivers
- Scenic viewpoints
- Natural attractions

---

## Experience & Feel

The experience should feel:

- **Visual-first** — large, high-quality imagery is central
- **Calm and uncluttered** — minimal distractions, easy browsing
- **Exploratory** — encourages users to click deeper and discover more
- **Fast and lightweight** — no friction or complexity

Users should feel like they’re **browsing a curated collection of places worth exploring**, not using a dense directory or search tool.

---

## Why It’s Valuable

There are many tools for navigation and reviews, but fewer that focus on **inspiration and discovery**.

Explorers Map fills that gap by:

- Highlighting interesting places in a structured way
- Making it easy to stumble upon new locations
- Removing noise (no reviews, no clutter, no overwhelm)
- Focusing purely on exploration

---

## Initial Scope

The first public version is intentionally simple:

- Public browsing first
- No reviews or ratings
- No social features
- No complex search

It starts as a **read-first exploration tool**, with authenticated CMS and admin capabilities planned as the next major product step.

---

## Future Potential

Over time, Explorers Map could evolve to include:

- Authenticated CMS and editorial workflows
- Saving and bookmarking places
- User-submitted locations
- Reviews and ratings
- Map-based browsing
- Personalized recommendations

---

## 2. Goals

### Primary Goals

- Create a clean, fast, and visually engaging directory of nature locations
- Enable intuitive exploration through administrative regions and named destinations
- Provide rich, structured data for each location
- Ensure scalability for the upcoming CMS/auth rollout and later features such as reviews and contributions

### Non-Goals (Initial Version)

- No user-generated content
- No reviews or ratings
- No social features
- No advanced search (basic filtering only)

---

## 3. Core Concept

The app uses a **country-led browsing model** with two complementary geographic layers:

```

Country
→ Region (state / county / province)
→ Destination (named discovery area, e.g. Jurassic Coast)
→ Listing Catalog (filtered/grouped listings view)
→ Individual Listing Page

```

`Region` is the required administrative parent for a listing. `Destination` is an optional discovery layer used for named areas that may span multiple regions.

---

## 4. Data Model

### 4.1 Entities

#### Country

- id (string, UUID)
- slug (string, unique)
- title (string)
- description (text)
- coverImage (string URL)
- createdAt
- updatedAt

---

#### Region

- id (string, UUID)
- countryId (FK → Country)
- slug (string, unique within country)
- title (string)
- description (text)
- coverImage (string URL)
- createdAt
- updatedAt

---

#### Destination

- id (string, UUID)
- countryId (FK → Country)
- slug (string, unique within country)
- title (string)
- description (text)
- coverImage (string URL)
- createdAt
- updatedAt

---

#### DestinationRegion (join table)

- destinationId (FK → Destination)
- regionId (FK → Region)

---

#### ListingDestination (join table)

- listingId (FK → Listing)
- destinationId (FK → Destination)

---

#### Listing

- id (string, UUID)
- regionId (FK → Region)
- slug (string, unique within region)
- status (enum: draft | published)
- title (string)
- shortDescription (string)
- description (text)
- latitude (float)
- longitude (float)
- busynessRating (integer, 1-5)
- googleMapsPlaceUrl (optional string)
- coverImage (string URL)
- createdBy (string or nullable FK)
- updatedBy (string or nullable FK)
- source (string, e.g. seed | mcp | manual)
- deletedAt (nullable datetime)
- createdAt
- updatedAt

---

#### ListingImage

- id (string, UUID)
- listingId (FK → Listing)
- imageUrl (string)

---

#### Tag

- id (string, UUID)
- name (string, unique)

---

#### ListingTag (join table)

- listingId (FK → Listing)
- tagId (FK → Tag)

---

#### Category (fixed enum or fixed table)

Examples:

- beach
- forest
- trail
- mountain
- park
- lake

---

## 5. URL Structure

```

/countries
/countries/[countrySlug]
/countries/[countrySlug]/regions
/countries/[countrySlug]/regions/[regionSlug]
/countries/[countrySlug]/regions/[regionSlug]/listings
/countries/[countrySlug]/regions/[regionSlug]/[listingSlug]
/countries/[countrySlug]/destinations
/countries/[countrySlug]/destinations/[destinationSlug]

```

---

## 6. UI / UX

### 6.1 Design Principles

- Visual-first (imagery is key)
- Minimal text clutter
- Fast navigation
- Mobile-first responsiveness

---

### 6.2 Pages

#### Countries Page

- Grid of cards
- Each card includes:
  - Cover image
  - Title
  - Short description

---

#### Regions Page

- Same card-based layout
- Filtered by selected country

---

#### Destinations Page

- Same card-based layout
- Filtered by selected country
- Designed for named areas and broader discovery-led browsing
- Shows only listings explicitly linked to that destination

---

#### Listings Catalog Page

- Card grid layout
- Each card includes:
  - Cover image
  - Title
  - Category/tag badges
  - Short description

- Optional:
  - Map preview (future enhancement)

---

#### Listing Detail Page

- Large hero image
- Title + description
- Image gallery
- Tags/categories
- Busyness rating
- Publication state should be supported in content operations
- Coordinates + map link
- Potential embedded Google Map

---

## 7. Business Logic

### 7.1 Hierarchical Integrity

- A Region must belong to a Country
- A Destination must belong to a Country
- A Destination can belong to multiple Regions through `DestinationRegion`
- A Listing must belong to a Region
- A Listing may belong to zero or more Destinations through `ListingDestination`
- A Listing belongs to one Region only in MVP
- Destination-to-region associations support browsing and curation, not hard validation
- Slugs must be unique within scope

---

### 7.2 Filtering

Listings can be filtered by:

- Category
- Tags
- Destination
- Busyness rating

Categories are fixed and curated. Tags remain flexible for descriptive labeling.

Future:

- Distance from user
- Popularity
- Difficulty (for trails)

---

### 7.3 SEO Strategy

- Static page generation for:
  - Countries
  - Regions
  - Destinations
  - Listings

- Metadata:
  - Title tags
  - Open Graph images
  - Descriptions

---

## 8. Technical Stack

### 8.1 Frontend

- **Next.js (App Router)**
- React Server Components
- Tailwind CSS (recommended)
- Shadcn/ui for components

---

### 8.2 Backend

- Next.js app reads directly from the database through shared query and service modules
- No broad dedicated Next.js CRUD API is required for MVP
- A narrow authenticated Actions API inside the Next.js app is allowed for private custom GPT and ChatGPT Actions workflows when an OpenAPI-described HTTP surface is required
- The web app and standalone MCP server should live in the same repository and share database/domain code

---

### 8.3 Content Operations and MCP

- Core create/update logic should live in shared service-layer functions
- The Next.js app and MCP server should both reuse the same shared database and service layer
- A separate MCP server can act as the primary machine-write interface for LLM-driven content operations
- The Next.js app may also expose a narrow authenticated HTTP Actions surface for custom GPT use, but it should remain a thin adapter over the same shared services and duplicate-safe editorial rules
- The initial MCP use case is the project owner using ChatGPT as a personal editorial assistant
- The initial Actions API use case is the project owner using ChatGPT Actions for a private custom GPT
- The MCP server should be designed for guided editorial workflows rather than broad raw CRUD access
- The MCP layer should act as a thin adapter, not a second source of truth for validation or database writes
- The Actions API should follow the same principle and avoid becoming a second write implementation
- Prefer task-shaped tools such as:
  - find region
  - ensure region
  - create region
  - find destination
  - create destination
  - list listings
  - find listing
  - get listing
  - ensure destination
  - ensure listing
  - create listing draft
  - update listing copy
  - update listing metadata
  - set listing location
  - assign listing destinations
  - attach listing images
  - improve region listings
  - improve destination listings
- Avoid exposing unrestricted raw CRUD tools to LLMs where possible
- Read tools should support fuzzy matching so the assistant can find likely existing regions, destinations, and listings even when names differ slightly
- Fuzzy lookup responses should include enough context for the assistant to prefer existing records and avoid duplicate creation
- Region and destination creation tools should check fuzzy matches first and return likely existing candidates before creating new records where appropriate
- Listing creation should also support an explicit ensure-or-match workflow so the assistant can detect likely duplicates before creating a new draft
- Write tools should default to draft creation or draft-preserving updates unless the user explicitly asks to publish
- The MCP surface should expose lightweight platform and editorial guidance so ChatGPT understands the data model and usage rules before taking action
- The standalone MCP server is expected to be remotely reachable for ChatGPT connector use
- The custom GPT Actions API should publish OpenAPI documentation and concise GPT usage instructions so ChatGPT can call it predictably
- MCP authentication should be implemented in two stages:
  - Stage 1: a simple private bearer token or API key for personal development and early private use
  - Stage 2: OAuth for the proper remote ChatGPT connector experience
- The initial Actions API auth model can use a private bearer token or API key for personal use
- The official TypeScript MCP SDK is the preferred implementation approach for this repository

Recommended repository shape:

```
apps/
  web/
  mcp/
packages/
  db/
  services/
```

The standalone MCP server is a separate process, but not a separate write implementation. It should import shared domain functions from `packages/services` and shared database access from `packages/db`.

Example editorial flow:

```
ChatGPT request
→ fuzzy lookup of region or destination
→ inspect existing records
→ create or improve draft listings
→ optional explicit publish step
```

Example flow:

```
LLM
→ MCP tool
→ shared service package
→ database
```

Public app flow:

```
Next.js page
→ shared query/service package
→ database
```

---

### 8.4 Database

- **SQLite**
- Suitable for early-stage MVP
- Chosen database for MVP
- Keep the schema SQLite-friendly and revisit Postgres only if future scale or concurrency demands it

---

### 8.5 ORM

- **Drizzle ORM**
- Type-safe schema definitions
- Migration support

---

### 8.6 Authentication

- **Better Auth**
- Planned for the next major web-app phase after the read-first MVP
- Browser auth should live inside `apps/web` and use session-based authentication for signed-in humans
- Initial auth scope should include:
  - open email/password signup
  - sign in
  - sign out
  - protected CMS routes
  - admin-managed user roles
- The default signup role should be `viewer`
- Core auth only in the first CMS phase:
  - no password reset yet
  - no email verification yet
- The first root admin user should be bootstrapped from environment-backed credentials as a one-time initialization path
- Bootstrap-admin behavior should be idempotent:
  - it should run only when no admin exists
  - it should not overwrite an existing admin when environment values change later
  - it should not run on every request
- Planned CMS roles:
  - `admin`
    - full CMS access
    - can create users
    - can assign roles
    - can manage countries, regions, destinations, and listings
  - `moderator`
    - tied to one or more assigned regions
    - can manage listings in assigned regions
    - can create listings only in regions they are assigned to manage
    - when creating or editing a listing, may only choose destinations that are attached to at least one region they manage
    - can create destinations when the destination is linked to at least one assigned region
    - can manage destinations when at least one linked destination region overlaps an assigned region
    - when creating or editing destination-region links, may only attach regions they are assigned to manage
    - can link an existing destination to any region they manage
    - may only change destination-region links within assigned regions
    - may not save a destination with zero overlap to assigned regions
  - `viewer`
    - default signup role
    - can authenticate
    - has no CMS access
- Core account-management constraints should include:
  - never remove or demote the last remaining admin
  - no hard delete of users in the first CMS/auth phase
- MCP server auth should start with a simple private API key or bearer token for MVP
- OAuth should be the target authentication model for remote ChatGPT connector use

---

## 9. Suggested Folder Structure

```

apps/
  web/
    app/
      countries/
        page.tsx
        [countrySlug]/
          page.tsx
          regions/
            page.tsx
            [regionSlug]/
              page.tsx
              listings/
                page.tsx
              [listingSlug]/
                page.tsx
          destinations/
            page.tsx
            [destinationSlug]/
              page.tsx
    components/
      ui/
      cards/
      layout/
    public/
      images/
  mcp/
    server.ts
    tools/

packages/
  db/
    schema.ts
    client.ts
    migrations/
  services/
    listings.ts
    destinations.ts
  utils/

```

---

## 10. Database Schema (Drizzle Example)

```ts
export const countries = sqliteTable("countries", {
  id: text("id").primaryKey(),
  slug: text("slug").unique(),
  title: text("title"),
  description: text("description"),
  coverImage: text("cover_image"),
});

export const regions = sqliteTable("regions", {
  id: text("id").primaryKey(),
  countryId: text("country_id").references(() => countries.id),
  slug: text("slug"),
  title: text("title"),
  description: text("description"),
  coverImage: text("cover_image"),
});

export const destinations = sqliteTable("destinations", {
  id: text("id").primaryKey(),
  countryId: text("country_id").references(() => countries.id),
  slug: text("slug"),
  title: text("title"),
  description: text("description"),
  coverImage: text("cover_image"),
});

export const destinationRegions = sqliteTable("destination_regions", {
  destinationId: text("destination_id").references(() => destinations.id),
  regionId: text("region_id").references(() => regions.id),
});

export const listings = sqliteTable("listings", {
  id: text("id").primaryKey(),
  regionId: text("region_id").references(() => regions.id),
  slug: text("slug"),
  status: text("status"),
  title: text("title"),
  shortDescription: text("short_description"),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  busynessRating: integer("busyness_rating"),
  googleMapsPlaceUrl: text("google_maps_place_url"),
  coverImage: text("cover_image"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  source: text("source"),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const listingDestinations = sqliteTable("listing_destinations", {
  listingId: text("listing_id").references(() => listings.id),
  destinationId: text("destination_id").references(() => destinations.id),
});
```

---

## 11. Future Enhancements

### Near-Term Product Expansion

- Authenticated CMS for countries, regions, destinations, and listings
- Role-based editorial permissions for admins and region-scoped moderators
- Viewer accounts for future signed-in product features without CMS access
- Password reset and email verification after the core auth rollout is stable

### Later Enhancements

- Save/bookmark locations
- Reviews & ratings
- Map-based browsing
- Geolocation search
- “Nearby places” feature
- User submissions
- Moderation system
- Broader contributor workflows beyond the internal CMS

---

## 12. MVP Scope Summary

**Included:**

- Hierarchical browsing
- Region and destination browsing
- Static pages
- Listings with images and metadata
- Listing galleries
- Basic filtering (tags/categories)
- Draft and published content states
- Soft delete to trash for content records
- Planned next-step authenticated CMS and web auth rollout

**Excluded:**

- Maps (interactive)
- Social features
- Multilingual support
- Password reset and email verification in the first CMS/auth phase

---

## 13. Open Questions

- Cloudflare object-storage upload strategy (direct upload, mediated upload, or URL-only workflow)

---

## 13.1 Resolved Decisions

- Image hosting will use Cloudflare's S3-compatible object storage
- Production image fields should store object-storage URLs
- Local placeholder image paths are acceptable during early development and seed-data setup
- Listings belong to a single Region only in MVP
- Multilingual support is out of scope for MVP
- Content records should support `draft` and `published` states
- Content records should include audit metadata
- Soft delete should move records to trash rather than permanently deleting them by default
- Browser auth should use Better Auth when the CMS phase lands
- Open signup should create `viewer` users by default
- Moderators should be region-scoped and may cover more than one region
- Moderators may edit a destination when at least one linked region overlaps their assigned regions
- Moderators may create a destination only when it is linked to at least one region they manage
- Moderators may attach only their own assigned regions when creating or editing destination-region links, including when linking an existing destination to one of their managed regions
- Moderators may create listings only in regions they manage
- When assigning destinations on a listing, moderators may select only destinations that are attached to at least one region they manage
- The bootstrap admin account should come from environment-backed credentials as a one-time initialization path

---

## 14. Content Model Decisions

- Listing pages are canonically routed under Regions
- Destination pages are discovery surfaces, not alternate canonical parents
- Destination pages show only listings explicitly linked to that destination
- Coordinates are the source of truth for map behavior; Google Maps place links are optional supplemental fields
- Busyness rating is curated editorial metadata on a 1-5 scale, where 1 is very quiet and 5 is very popular and busy
- Production `coverImage` and gallery image fields should point to Cloudflare S3-compatible object-storage assets
- Upload strategy for Cloudflare object storage will be decided later without blocking the initial data model
- Shared service-layer functions in the shared code package are the single write path for scripts and MCP tools, and the shared domain layer for app reads
- MCP should expose curated task-based tools rather than unrestricted database CRUD
- No dedicated Next.js write API is required for MVP
- Content should support draft/published lifecycle, audit metadata, and soft delete to trash
- CMS web mutations should use one thin web transport pattern and delegate authorization and persistence to shared services rather than mixing business logic across multiple web entrypoints
- MCP-assisted editorial workflows should prefer lookup and improvement of existing records before creating new ones
- Fuzzy matching should be used for region, destination, and listing lookups to reduce accidental duplicates caused by naming variation
- MCP-driven creation should default to `draft` unless the user explicitly asks to publish
- Required listing fields:
  - title
  - slug
  - coverImage
  - shortDescription
  - description
  - region
  - status
  - latitude / longitude
  - busynessRating
  - category
- Optional listing fields:
  - destination links
  - image gallery
  - googleMapsPlaceUrl
- Slugs for countries, regions, destinations, and listings should remain editable in the CMS
- Slug edits should update the canonical URL immediately
- Redirect history for old slugs is out of scope for the first CMS/auth phase
- Audit attribution should extend to CMS edits for countries, regions, destinations, listings, and admin-managed user changes
- Public browsing must remain available to anonymous users while CMS routes stay protected
- Existing MCP and Actions bearer-token auth flows must remain separate from browser-session auth

---

## 15. Next Steps

1. Implement browser auth and protected CMS foundations in `apps/web`
2. Add admin user management and role assignment
3. Add CMS flows for countries, regions, destinations, and listings
4. Keep CMS writes centralized in shared services with RBAC enforcement
5. Preserve the public browsing experience while the CMS surface lands
6. Iterate on editorial UX and later account features
