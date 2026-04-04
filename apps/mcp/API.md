# Explorers Map MCP API

This document describes the implemented MCP surface for `apps/mcp`.

The server now runs as a remote stateless Streamable HTTP MCP server at `POST /mcp` with a `GET /healthz` health check.

## Purpose

The Explorers Map MCP server is intended to let ChatGPT act as a careful editorial assistant for:

- Regions
- Destinations
- Listings

The server should help ChatGPT:

- read existing records before writing
- avoid duplicate creation
- create draft-first content
- refuse unsupported or under-evidenced creation
- work with strict editorial guardrails instead of unrestricted CRUD

## Authentication

All MCP requests require:

```http
Authorization: Bearer <EXPLORERS_MAP_MCP_AUTH_TOKEN>
```

Requests without a valid bearer token are rejected before tool execution with a structured JSON-RPC error and HTTP `401`.

## Core Rules

- Always check existing records before creating new ones.
- Fuzzy matching is allowed for discovery, but ambiguous matches must stop and return candidates.
- New factual claims and new records require non-empty structured `evidence[]`.
- `evidence[]` is validated and echoed back in tool responses, but is not persisted in the DB in MVP.
- Listing draft creation must satisfy the existing required DB schema. No sparse or placeholder-only drafts.
- Categories are fixed and curated. The MCP server does not create categories.
- New records default to `draft` unless the user explicitly asks to publish.
- MCP writes must use shared service-layer logic and stamp `source = "mcp"`.

## Shared Schemas

### EvidenceInput

```ts
type EvidenceInput = Array<{
  label: string;
  note: string;
  url?: string;
}>;
```

### MatchCandidate

```ts
type MatchCandidate = {
  id: string;
  type: "region" | "destination" | "listing";
  countrySlug: string;
  slug: string;
  title: string;
  confidence: number;
  reasons: string[];
};
```

### FindResult

```ts
type FindResult = {
  status: "exact_match" | "candidate_matches" | "not_found";
  confidence: number;
  reasons: string[];
  candidates: MatchCandidate[];
};
```

### EnsureResult

```ts
type EnsureResult<TRecord> = {
  status: "matched" | "created" | "candidate_matches" | "insufficient_evidence";
  confidence: number;
  reasons: string[];
  record?: TRecord;
  candidates?: MatchCandidate[];
  evidence?: EvidenceInput;
  warnings?: string[];
};
```

### MutationResult

```ts
type MutationResult<TRecord> = {
  status: "created" | "updated" | "unchanged";
  record: TRecord;
  evidence: EvidenceInput;
  warnings: string[];
};
```

### Common Locators

```ts
type CountryLocator = {
  countrySlug: string;
};

type RegionLocator = CountryLocator & {
  regionSlug: string;
};

type DestinationLocator = CountryLocator & {
  destinationSlug: string;
};

type ListingLocator = RegionLocator & {
  listingSlug: string;
};
```

## Record Shapes

### CategoryRecord

```ts
type CategoryRecord = {
  slug: string;
  title: string;
};
```

### RegionRecord

```ts
type RegionRecord = {
  id: string;
  countrySlug: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};
```

### DestinationRecord

```ts
type DestinationRecord = {
  id: string;
  countrySlug: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  regions: Array<{
    slug: string;
    title: string;
  }>;
};
```

### ListingRecord

```ts
type ListingRecord = {
  id: string;
  countrySlug: string;
  regionSlug: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  deletedAt: string | null;
  shortDescription: string;
  description: string;
  latitude: number;
  longitude: number;
  busynessRating: number;
  googleMapsPlaceUrl: string | null;
  coverImage: string;
  category: {
    slug: string;
    title: string;
  };
  destinations: Array<{
    slug: string;
    title: string;
  }>;
  images: Array<{
    id: string;
    imageUrl: string;
    sortOrder: number;
  }>;
  source: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};
```

## Resources

The server exposes a small read-only resource surface for ChatGPT:

- `explorers-map://context/platform`
- `explorers-map://context/data-model`
- `explorers-map://context/editorial-rules`

## Error Behavior

Expected structured error categories:

- `INVALID_INPUT`
- `NOT_FOUND`
- `CONFLICT`
- `INVALID_STATE`
- `INSUFFICIENT_EVIDENCE`
- `AMBIGUOUS_MATCH`
- `UNAUTHENTICATED`

Tool handlers should prefer structured result payloads for expected editorial outcomes such as candidate matches or insufficient evidence, and reserve hard errors for invalid or unauthorized calls.

Current implementation detail:

- invalid or unauthorized HTTP requests return structured JSON-RPC error bodies
- tool and domain failures return MCP tool results with `isError: true` and structured `{ error: { code, message } }`

## Tool Reference

## Reference Tools

### `list_categories`

- Purpose: return the fixed curated categories available for listings
- Use when: ChatGPT needs a valid `categorySlug` before creating or updating a listing
- Required parameters: none
- Optional parameters: none
- Response: `{ categories: CategoryRecord[] }`
- Error cases: none expected beyond runtime failure

### `list_regions`

- Purpose: list regions within a country
- Use when: preparing to create or relate destinations or listings inside a known country
- Required parameters: `countrySlug`
- Optional parameters: none
- Response: `{ regions: RegionRecord[] }`
- Error cases: `NOT_FOUND` if the country does not exist

### `get_region`

- Purpose: fetch one region by country and region slug
- Use when: ChatGPT already has a specific region slug and needs canonical data
- Required parameters: `countrySlug`, `regionSlug`
- Optional parameters: none
- Response: `{ region: RegionRecord }`
- Error cases: `NOT_FOUND`

### `list_destinations`

- Purpose: list destinations within a country
- Use when: checking whether a named discovery area already exists
- Required parameters: `countrySlug`
- Optional parameters: `regionSlug` if the caller wants destinations already linked to one region
- Response: `{ destinations: DestinationRecord[] }`
- Error cases: `NOT_FOUND` if the country or optional region does not exist

### `get_destination`

- Purpose: fetch one destination by country and destination slug
- Use when: ChatGPT already has a specific destination slug and needs its linked regions
- Required parameters: `countrySlug`, `destinationSlug`
- Optional parameters: none
- Response: `{ destination: DestinationRecord }`
- Error cases: `NOT_FOUND`

### `list_listings`

- Purpose: list listings visible to the editor for duplicate checking and curation
- Use when: ChatGPT needs to inspect a region or destination before creating or updating listings
- Required parameters: `countrySlug` plus exactly one of `regionSlug` or `destinationSlug`
- Optional parameters: `includeDrafts`, `includeTrashed`
- Response: `{ listings: ListingRecord[] }`
- Error cases: `INVALID_INPUT` if both or neither scope parameters are supplied, `NOT_FOUND` if the parent record is missing

### `get_listing`

- Purpose: fetch one listing with editorial fields, lifecycle state, and linked destinations
- Use when: ChatGPT already has a specific listing slug and needs full editorial detail
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`
- Optional parameters: none
- Response: `{ listing: ListingRecord }`
- Error cases: `NOT_FOUND`

## Find Tools

### `find_region`

- Purpose: fuzzy-find a region inside one country
- Use when: the prompt contains a name that may not match the canonical slug exactly
- Required parameters: `countrySlug`, `query`
- Optional parameters: `limit`
- Response: `FindResult`
- Error cases: `INVALID_INPUT` for blank query

### `find_destination`

- Purpose: fuzzy-find a destination inside one country
- Use when: the destination name may differ slightly from the stored title or slug
- Required parameters: `countrySlug`, `query`
- Optional parameters: `limit`, `regionSlug` for extra context
- Response: `FindResult`
- Error cases: `INVALID_INPUT` for blank query

### `find_listing`

- Purpose: fuzzy-find a listing while considering region scope and existing titles
- Use when: the assistant is checking for duplicates before creating a new listing
- Required parameters: `countrySlug`, `query`
- Optional parameters: `regionSlug`, `destinationSlug`, `latitude`, `longitude`, `limit`
- Response: `FindResult`
- Error cases: `INVALID_INPUT` for blank query or invalid mixed scope

## Ensure And Create Tools

### `ensure_region`

- Purpose: reuse an existing region when possible, otherwise create a new one safely
- Use when: the prompt names a region that may or may not already exist
- Required parameters: `countrySlug`, `title`, `description`, `coverImage`
- Optional parameters: `slug`, `evidence`
- Response: `EnsureResult<RegionRecord>`
- Error cases: `INSUFFICIENT_EVIDENCE`, `CONFLICT`, `NOT_FOUND`

### `create_region`

- Purpose: force creation of a new region after the caller has already decided creation is necessary
- Use when: a prior lookup has shown that a region does not exist and the evidence is strong
- Required parameters: `countrySlug`, `title`, `description`, `coverImage`, `evidence`
- Optional parameters: `slug`
- Response: `MutationResult<RegionRecord>`
- Error cases: `INSUFFICIENT_EVIDENCE`, `CONFLICT`, `NOT_FOUND`

### `ensure_destination`

- Purpose: reuse an existing destination when possible, otherwise create it safely
- Use when: the prompt names a destination that may already exist or may need to be created
- Required parameters: `countrySlug`, `title`, `description`, `coverImage`
- Optional parameters: `slug`, `regionSlugs`, `evidence`
- Response: `EnsureResult<DestinationRecord>`
- Error cases: `INSUFFICIENT_EVIDENCE`, `CONFLICT`, `NOT_FOUND`

### `create_destination`

- Purpose: force creation of a new destination
- Use when: the caller has already confirmed that no safe existing destination should be reused
- Required parameters: `countrySlug`, `title`, `description`, `coverImage`, `evidence`
- Optional parameters: `slug`, `regionSlugs`
- Response: `MutationResult<DestinationRecord>`
- Error cases: `INSUFFICIENT_EVIDENCE`, `CONFLICT`, `NOT_FOUND`

### `assign_destination_regions`

- Purpose: assign the region set for a destination
- Use when: a destination should explicitly belong to one or more regions
- Required parameters: `countrySlug`, `destinationSlug`, `regionSlugs`
- Optional parameters: `evidence`
- Response: `MutationResult<DestinationRecord>`
- Error cases: `NOT_FOUND`, `INVALID_INPUT`

### `ensure_listing`

- Purpose: reuse an existing listing when possible, otherwise create a new draft safely
- Use when: ChatGPT has a candidate place and wants duplicate-safe creation
- Required parameters:
  - `countrySlug`
  - `regionSlug`
  - `title`
  - `shortDescription`
  - `description`
  - `latitude`
  - `longitude`
  - `busynessRating`
  - `coverImage`
  - `categorySlug`
- Optional parameters:
  - `slug`
  - `googleMapsPlaceUrl`
  - `destinationSlugs`
  - `images`
  - `evidence`
- Response: `EnsureResult<ListingRecord>`
- Error cases: `INSUFFICIENT_EVIDENCE`, `CONFLICT`, `NOT_FOUND`, `INVALID_INPUT`

### `create_listing_draft`

- Purpose: create a fully populated draft listing
- Use when: duplicate checking is complete and the candidate record is fully grounded
- Required parameters:
  - `countrySlug`
  - `regionSlug`
  - `title`
  - `shortDescription`
  - `description`
  - `latitude`
  - `longitude`
  - `busynessRating`
  - `coverImage`
  - `categorySlug`
  - `evidence`
- Optional parameters:
  - `slug`
  - `googleMapsPlaceUrl`
  - `destinationSlugs`
  - `images`
- Response: `MutationResult<ListingRecord>`
- Error cases: `INSUFFICIENT_EVIDENCE`, `CONFLICT`, `NOT_FOUND`, `INVALID_INPUT`

## Update And Lifecycle Tools

### `update_listing_copy`

- Purpose: update editorial copy fields for an existing listing
- Use when: revising title or descriptive text without changing lifecycle or geography
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`
- Optional parameters: `title`, `shortDescription`, `description`, `evidence`
- Response: `MutationResult<ListingRecord>`
- Error cases: `NOT_FOUND`, `INVALID_INPUT`, `INVALID_STATE`

### `update_listing_metadata`

- Purpose: update non-location listing metadata
- Use when: changing slug, cover image, category, or busyness rating
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`
- Optional parameters: `slug`, `coverImage`, `categorySlug`, `busynessRating`, `evidence`
- Response: `MutationResult<ListingRecord>`
- Error cases: `NOT_FOUND`, `INVALID_INPUT`, `INVALID_STATE`, `CONFLICT`

### `set_listing_location`

- Purpose: set or update listing coordinates and optional Google Maps place URL
- Use when: correcting or grounding map data
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`, `latitude`, `longitude`
- Optional parameters: `googleMapsPlaceUrl`, `evidence`
- Response: `MutationResult<ListingRecord>`
- Error cases: `NOT_FOUND`, `INVALID_INPUT`, `INVALID_STATE`

### `assign_listing_destinations`

- Purpose: replace the destination set for a listing
- Use when: linking or relinking a listing to curated destinations
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`, `destinationSlugs`
- Optional parameters: `evidence`
- Response: `MutationResult<ListingRecord>`
- Error cases: `NOT_FOUND`, `INVALID_INPUT`, `INVALID_STATE`

### `attach_listing_images`

- Purpose: replace the gallery image set for a listing
- Use when: adding or reordering supporting images
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`, `images`
- Optional parameters: `evidence`
- Response: `MutationResult<ListingRecord>`
- Error cases: `NOT_FOUND`, `INVALID_INPUT`, `INVALID_STATE`

### `publish_listing`

- Purpose: publish an existing draft listing
- Use when: the user explicitly asks for publish behavior
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`
- Optional parameters: `evidence`
- Response: `MutationResult<ListingRecord>`
- Error cases: `NOT_FOUND`, `INVALID_STATE`

### `move_listing_to_trash`

- Purpose: soft-delete a listing into trash
- Use when: the user explicitly wants a listing removed from public visibility without permanent deletion
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`
- Optional parameters: `evidence`
- Response: `MutationResult<ListingRecord>`
- Error cases: `NOT_FOUND`

### `restore_listing_from_trash`

- Purpose: restore a trashed listing
- Use when: the user wants a soft-deleted listing available for draft or published workflows again
- Required parameters: `countrySlug`, `regionSlug`, `listingSlug`
- Optional parameters: `evidence`
- Response: `MutationResult<ListingRecord>`
- Error cases: `NOT_FOUND`

## Example ChatGPT Workflows

### Create 5 suggested listings in Devon

Recommended tool order:

1. `find_region` for `Devon`
2. `list_listings` scoped to `Devon`
3. `find_destination` or `list_destinations` for any named destination references
4. `find_listing` for each candidate place
5. `ensure_destination` only when a required destination is missing and evidence exists
6. `create_listing_draft` only for candidates with complete fields and evidence
7. `assign_listing_destinations` when destination links are needed

If there are only two grounded new places, ChatGPT should report two and explain that it cannot safely invent the other three.

### Create a new destination in Somerset and add 3 listings to it

Recommended tool order:

1. `find_region` or `get_region` for `Somerset`
2. `find_destination`
3. `create_destination` or `ensure_destination`
4. `assign_destination_regions`
5. `list_listings` scoped to Somerset
6. `find_listing` for each candidate listing
7. `create_listing_draft` only when evidence is complete
8. `assign_listing_destinations`

### Add Peak District National Park as a destination and add 3 listings to it

Recommended tool order:

1. `find_destination` for `Peak District National Park`
2. If there is an exact safe match, reuse it with `get_destination`
3. If there is no safe destination match, determine the intended supporting Regions and run `find_region` for each one
4. For any missing Region that is genuinely required, use `ensure_region` or `create_region` with evidence
5. If the Destination is still missing, use `ensure_destination` or `create_destination` with evidence
6. Run `assign_destination_regions` so the Destination is explicitly linked to the required Regions
7. Use `list_listings` scoped to the Destination if it already exists, and also inspect relevant Region listings if the Destination was newly created
8. Run `find_listing` for each proposed new place before creating anything
9. Use `create_listing_draft` only for evidence-backed candidates with complete required fields
10. Use `assign_listing_destinations` to link the created or reused Listings to `Peak District National Park`

Additional guidance:

- Reuse the existing `Peak District National Park` destination if it already exists, but do not assume it does.
- Reuse existing linked Regions such as `Derbyshire` and `Staffordshire` when they already exist, but create required missing Regions only with evidence.
- Review existing destination and region listings before deciding that more are needed.
- Stop if the suggested additions look duplicative, ambiguous, or under-evidenced.

## Explicit Non-Goals For V1

- No unrestricted CRUD tool surface
- No category creation tools
- No automatic creation on ambiguous matches
- No placeholder-only listing drafts
- No evidence persistence in the DB yet
- No composite tools such as `improve_region_listings` or `improve_destination_listings` until they are defined with explicit evidence-driven boundaries
