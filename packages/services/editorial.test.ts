import assert from "node:assert/strict";
import test from "node:test";

import {
  assignDestinationRegions,
  createDestination,
  createListingDraftForEditor,
  createRegion,
  ensureDestination,
  ensureListing,
  ensureRegion,
  findDestination,
  findListing,
  findRegion,
  getDestinationForEditor,
  listListingsForEditor,
  trashListingForEditor,
} from "./index.ts";
import { ServiceError } from "./errors.ts";
import { createSeededTestDb } from "./test-helpers.ts";

const evidence = [
  {
    label: "Editorial note",
    note: "Verified against the current curated source list.",
    url: "https://example.com/source",
  },
];

test("createRegion derives slugs and rejects country-scoped collisions", (t) => {
  const dbInstance = createSeededTestDb(t);

  const created = createRegion(
    {
      countrySlug: "united-kingdom",
      title: "North Devon Coast",
      description: "A coastal editorial region for testing.",
      coverImage: "https://example.com/north-devon-coast.jpg",
      evidence,
    },
    dbInstance,
  );

  assert.equal(created.status, "created");
  assert.equal(created.record.slug, "north-devon-coast");

  assert.throws(
    () =>
      createRegion(
        {
          countrySlug: "united-kingdom",
          title: "Dorset",
          description: "Duplicate region slug attempt.",
          coverImage: "https://example.com/duplicate-region.jpg",
          evidence,
        },
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "CONFLICT",
  );
});

test("destination creation and destination-region reassignment stay country-scoped", (t) => {
  const dbInstance = createSeededTestDb(t);

  const created = createDestination(
    {
      countrySlug: "united-kingdom",
      title: "Devon Estuaries",
      description: "A destination for Devon estuary exploration.",
      coverImage: "https://example.com/devon-estuaries.jpg",
      regionSlugs: ["devon"],
      evidence,
    },
    dbInstance,
  );

  assert.equal(created.record.slug, "devon-estuaries");
  assert.deepEqual(created.record.regions.map((region) => region.slug), ["devon"]);

  const updated = assignDestinationRegions(
    {
      countrySlug: "united-kingdom",
      destinationSlug: "devon-estuaries",
      regionSlugs: ["devon", "dorset"],
      evidence,
    },
    dbInstance,
  );

  assert.equal(updated.status, "updated");
  assert.deepEqual(
    updated.record.regions.map((region) => region.slug),
    ["devon", "dorset"],
  );

  const destination = getDestinationForEditor(
    { countrySlug: "united-kingdom", destinationSlug: "devon-estuaries" },
    dbInstance,
  );

  assert.deepEqual(
    destination.regions.map((region) => region.slug),
    ["devon", "dorset"],
  );
});

test("editor listing reads can include drafts and trashed records without hiding published content", (t) => {
  const dbInstance = createSeededTestDb(t);

  createListingDraftForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      title: "Secret Quarry",
      shortDescription: "Draft-only listing for editorial reads.",
      description: "A hidden test quarry.",
      latitude: 50.65,
      longitude: -2.31,
      busynessRating: 2,
      coverImage: "https://example.com/secret-quarry.jpg",
      categorySlug: "park",
      evidence,
    },
    { source: "mcp", actorId: null },
    dbInstance,
  );

  const defaultListings = listListingsForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
    },
    dbInstance,
  );
  const withDrafts = listListingsForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      includeDrafts: true,
    },
    dbInstance,
  );

  assert.ok(defaultListings.some((listing) => listing.slug === "durdle-door"));
  assert.ok(!defaultListings.some((listing) => listing.slug === "secret-quarry"));
  assert.ok(withDrafts.some((listing) => listing.slug === "secret-quarry"));

  const trashed = createListingDraftForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      title: "Old Jetty",
      shortDescription: "Draft that will be trashed.",
      description: "Trash visibility coverage.",
      latitude: 50.66,
      longitude: -2.3,
      busynessRating: 1,
      coverImage: "https://example.com/old-jetty.jpg",
      categorySlug: "beach",
      evidence,
    },
    { source: "mcp", actorId: null },
    dbInstance,
  );

  trashListingForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      listingSlug: trashed.record.slug,
    },
    evidence,
    { source: "mcp", actorId: null },
    dbInstance,
  );

  const withTrashed = listListingsForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      includeDrafts: true,
      includeTrashed: true,
    },
    dbInstance,
  );

  assert.ok(withTrashed.some((listing) => listing.slug === "old-jetty" && listing.deletedAt !== null));
  assert.ok(withTrashed.some((listing) => listing.slug === "durdle-door"));
});

test("find helpers expose exact, candidate, and not-found outcomes", (t) => {
  const dbInstance = createSeededTestDb(t);

  const exactRegion = findRegion(
    { countrySlug: "united-kingdom", query: "Dorset" },
    dbInstance,
  );
  const candidateDestination = findDestination(
    { countrySlug: "united-kingdom", query: "Peak District" },
    dbInstance,
  );
  const exactListing = findListing(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      query: "Durdle Door",
      latitude: 50.6212,
      longitude: -2.2763,
    },
    dbInstance,
  );
  const missingListing = findListing(
    {
      countrySlug: "united-kingdom",
      query: "Completely Invented Place",
    },
    dbInstance,
  );

  assert.equal(exactRegion.status, "exact_match");
  assert.equal(exactRegion.candidates[0]?.slug, "dorset");
  assert.equal(candidateDestination.status, "candidate_matches");
  assert.equal(candidateDestination.candidates[0]?.slug, "peak-district-national-park");
  assert.equal(exactListing.status, "exact_match");
  assert.equal(exactListing.candidates[0]?.slug, "durdle-door");
  assert.equal(missingListing.status, "not_found");
});

test("ensureRegion stays strict while listing exact matches are still reused", (t) => {
  const dbInstance = createSeededTestDb(t);

  const missingRegion = ensureRegion(
    {
      countrySlug: "united-kingdom",
      title: "Hidden Highlands",
      description: "Would be created only with evidence.",
      coverImage: "https://example.com/hidden-highlands.jpg",
    },
    dbInstance,
  );

  assert.equal(missingRegion.status, "insufficient_evidence");

  const matchedListing = ensureListing(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      title: "Durdle Door",
      shortDescription: "Should match the existing listing.",
      description: "Should not create a duplicate.",
      latitude: 50.6212,
      longitude: -2.2763,
      busynessRating: 5,
      coverImage: "https://example.com/durdle-door.jpg",
      categorySlug: "natural-attraction",
      evidence,
    },
    { source: "mcp", actorId: null },
    dbInstance,
  );

  assert.equal(matchedListing.status, "matched");
  assert.equal(matchedListing.record?.slug, "durdle-door");
});

test("destination creation accepts title and description only", (t) => {
  const dbInstance = createSeededTestDb(t);

  const created = ensureDestination(
    {
      countrySlug: "united-kingdom",
      title: "Bare Cliffs",
      description: "A draft destination created without cover media or evidence.",
    },
    dbInstance,
  );

  assert.equal(created.status, "created");
  assert.equal(created.record?.slug, "bare-cliffs");
  assert.equal(created.record?.coverImage, null);

  assert.throws(
    () =>
      createDestination(
        {
          countrySlug: "united-kingdom",
          title: "Missing Copy",
          description: "",
        },
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "INVALID_INPUT",
  );
});

test("region-scoped listing matching ignores weak cross-region candidates during create flows", (t) => {
  const dbInstance = createSeededTestDb(t);

  const scopedSearch = findListing(
    {
      countrySlug: "united-kingdom",
      regionSlug: "somerset",
      query: "Glastonbury Tor",
      latitude: 51.1456,
      longitude: -2.6877,
    },
    dbInstance,
  );

  assert.equal(scopedSearch.status, "not_found");

  const createdListing = ensureListing(
    {
      countrySlug: "united-kingdom",
      regionSlug: "somerset",
      title: "Glastonbury Tor",
      shortDescription: "A hilltop landmark above Glastonbury.",
      description: "A new Somerset draft used to verify region-scoped duplicate protection.",
      latitude: 51.1456,
      longitude: -2.6877,
      busynessRating: 4,
      coverImage: "https://example.com/glastonbury-tor.jpg",
      categorySlug: "viewpoint",
      evidence,
    },
    { source: "mcp", actorId: null },
    dbInstance,
  );

  assert.equal(createdListing.status, "created");
  assert.equal(createdListing.record?.slug, "glastonbury-tor");
  assert.equal(createdListing.record?.regionSlug, "somerset");
  assert.ok(
    (createdListing.warnings ?? []).some(
      (warning) => warning.includes("Mam Tor") && warning.includes("Derbyshire"),
    ),
  );
});

test("same-region fuzzy listing candidates are advisory and do not block creation", (t) => {
  const dbInstance = createSeededTestDb(t);

  createListingDraftForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "somerset",
      title: "Shapwick Marsh Walk",
      shortDescription: "Existing reserve-style listing for advisory duplicate coverage.",
      description: "A seeded Somerset listing used to verify advisory candidate behavior.",
      latitude: 51.1649,
      longitude: -2.8015,
      busynessRating: 3,
      coverImage: "https://example.com/shapwick-heath-reserve.jpg",
      categorySlug: "park",
      evidence,
    },
    { source: "mcp", actorId: null },
    dbInstance,
  );

  const createdListing = ensureListing(
    {
      countrySlug: "united-kingdom",
      regionSlug: "somerset",
      title: "Shapwick Heath Reserve",
      shortDescription: "A closely named Somerset reserve listing that should still be allowed.",
      description: "A new Somerset draft used to verify same-region fuzzy candidates stay advisory.",
      latitude: 51.165,
      longitude: -2.801,
      busynessRating: 3,
      coverImage: "https://example.com/shapwick-heath-nnr.jpg",
      categorySlug: "park",
      evidence,
    },
    { source: "mcp", actorId: null },
    dbInstance,
  );

  assert.equal(createdListing.status, "created");
  assert.equal(createdListing.record?.slug, "shapwick-heath-reserve");
  assert.ok((createdListing.candidates ?? []).some((candidate) => candidate.title === "Shapwick Marsh Walk"));
  assert.ok(
    (createdListing.warnings ?? []).some(
      (warning) => warning.includes("Shapwick Marsh Walk") && warning.includes("potential duplicate"),
    ),
  );
});

test("listing creation allows sparse optional metadata but still rejects missing copy and slug collisions", (t) => {
  const dbInstance = createSeededTestDb(t);

  const sparse = createListingDraftForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      title: "Quiet Bay",
      shortDescription: "Evidence-free listing.",
      description: "Should create without optional metadata.",
    },
    { source: "mcp", actorId: null },
    dbInstance,
  );

  assert.equal(sparse.status, "created");
  assert.equal(sparse.record.coverImage, null);
  assert.equal(sparse.record.category, null);
  assert.equal(sparse.record.latitude, null);
  assert.equal(sparse.record.longitude, null);
  assert.equal(sparse.record.busynessRating, null);

  assert.throws(
    () =>
      createListingDraftForEditor(
        {
          countrySlug: "united-kingdom",
          regionSlug: "dorset",
          title: "No Short Copy",
          shortDescription: "",
          description: "Missing required short copy should still fail.",
        },
        { source: "mcp", actorId: null },
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "INVALID_INPUT",
  );

  assert.throws(
    () =>
      createListingDraftForEditor(
        {
          countrySlug: "united-kingdom",
          regionSlug: "dorset",
          title: "Durdle Door",
          shortDescription: "Duplicate title-derived slug.",
          description: "Should fail on slug collision.",
          latitude: 50.62,
          longitude: -2.28,
          busynessRating: 4,
          coverImage: "https://example.com/duplicate-durdle-door.jpg",
          categorySlug: "natural-attraction",
          evidence,
        },
        { source: "mcp", actorId: null },
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "CONFLICT",
  );
});
