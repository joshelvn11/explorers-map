import assert from "node:assert/strict";
import test from "node:test";

import {
  assignDestinationRegions,
  createDestination,
  createListingDraftForEditor,
  createRegion,
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

test("ensureRegion and ensureListing stop without evidence and reuse existing exact matches", (t) => {
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

test("listing creation requires evidence and still rejects derived slug collisions", (t) => {
  const dbInstance = createSeededTestDb(t);

  assert.throws(
    () =>
      createListingDraftForEditor(
        {
          countrySlug: "united-kingdom",
          regionSlug: "dorset",
          title: "Quiet Bay",
          shortDescription: "Evidence-free listing.",
          description: "Should fail without evidence.",
          latitude: 50.61,
          longitude: -2.26,
          busynessRating: 2,
          coverImage: "https://example.com/quiet-bay.jpg",
          categorySlug: "beach",
        },
        { source: "mcp", actorId: null },
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "INSUFFICIENT_EVIDENCE",
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
