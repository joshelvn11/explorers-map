import assert from "node:assert/strict";
import test from "node:test";

import { asc, eq } from "drizzle-orm";

import { countries, destinations, listingImages } from "@explorers-map/db";

import {
  assignListingDestinations,
  createListingDraft,
  getCountryBySlug,
  getDestinationBySlug,
  getListingDetail,
  getRegionListingCatalog,
  getRegionBySlug,
  listCountries,
  listDestinationsForCountry,
  listDestinationsForRegion,
  listListingsForDestination,
  listListingsForRegion,
  listRegionsForCountry,
  publishListing,
  restoreListing,
  setListingImages,
  trashListing,
  unpublishListing,
  updateListingCopyAndMetadata,
} from "./index.ts";
import { ServiceError } from "./errors.ts";
import { createSeededTestDb } from "./test-helpers.ts";

test("public browse queries expose seeded country, region, and destination detail shapes", (t) => {
  const dbInstance = createSeededTestDb(t);

  const countriesResult = listCountries(dbInstance);
  const country = getCountryBySlug("united-kingdom", dbInstance);
  const regionsResult = listRegionsForCountry("united-kingdom", dbInstance);
  const region = getRegionBySlug({ countrySlug: "united-kingdom", regionSlug: "dorset" }, dbInstance);
  const destinationsResult = listDestinationsForCountry("united-kingdom", dbInstance);
  const destination = getDestinationBySlug(
    { countrySlug: "united-kingdom", destinationSlug: "jurassic-coast" },
    dbInstance,
  );

  assert.equal(countriesResult.length, 1);
  assert.equal(countriesResult[0]?.slug, "united-kingdom");
  assert.equal(country?.title, "United Kingdom");
  assert.ok(regionsResult.some((item) => item.slug === "dorset"));
  assert.equal(region?.country.slug, "united-kingdom");
  assert.ok(destinationsResult.some((item) => item.slug === "jurassic-coast"));
  assert.deepEqual(
    destination?.regions.map((item) => item.slug),
    ["devon", "dorset"],
  );
});

test("public region listings exclude draft and trashed content by default", (t) => {
  const dbInstance = createSeededTestDb(t);

  createListingDraft(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      slug: "secret-cove",
      title: "Secret Cove",
      shortDescription: "A draft listing that should stay hidden.",
      description: "Draft copy.",
      latitude: 50.6,
      longitude: -2.2,
      busynessRating: 2,
      coverImage: "https://example.com/secret-cove.jpg",
      categorySlug: "beach",
    },
    { source: "manual", actorId: "editor-1" },
    dbInstance,
  );

  trashListing(
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "old-harry-rocks" },
    { source: "manual", actorId: "editor-2" },
    dbInstance,
  );

  const listingsResult = listListingsForRegion({ countrySlug: "united-kingdom", regionSlug: "dorset" }, dbInstance);

  assert.ok(listingsResult.some((item) => item.slug === "durdle-door"));
  assert.ok(!listingsResult.some((item) => item.slug === "secret-cove"));
  assert.ok(!listingsResult.some((item) => item.slug === "old-harry-rocks"));
});

test("destination listings only include explicitly linked listings", (t) => {
  const dbInstance = createSeededTestDb(t);

  const jurassicCoastListings = listListingsForDestination(
    { countrySlug: "united-kingdom", destinationSlug: "jurassic-coast" },
    dbInstance,
  );

  assert.ok(jurassicCoastListings.some((item) => item.slug === "durdle-door"));
  assert.ok(jurassicCoastListings.some((item) => item.slug === "beer-head"));
  assert.ok(!jurassicCoastListings.some((item) => item.slug === "mam-tor"));
  assert.ok(!jurassicCoastListings.some((item) => item.slug === "cheddar-gorge"));
});

test("region destination snippets only include destinations explicitly linked to that region", (t) => {
  const dbInstance = createSeededTestDb(t);

  const dorsetDestinations = listDestinationsForRegion(
    { countrySlug: "united-kingdom", regionSlug: "dorset" },
    dbInstance,
  );
  const staffordshireDestinations = listDestinationsForRegion(
    { countrySlug: "united-kingdom", regionSlug: "staffordshire" },
    dbInstance,
  );

  assert.deepEqual(
    dorsetDestinations.map((item) => item.slug),
    ["jurassic-coast"],
  );
  assert.deepEqual(
    staffordshireDestinations.map((item) => item.slug),
    ["peak-district-national-park"],
  );
});

test("region catalog filters normalize invalid values and expose stable facets", (t) => {
  const dbInstance = createSeededTestDb(t);

  createListingDraft(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      slug: "hidden-bay",
      title: "Hidden Bay",
      shortDescription: "Hidden draft listing",
      description: "Draft-only listing",
      latitude: 50.61,
      longitude: -2.19,
      busynessRating: 1,
      coverImage: "https://example.com/hidden-bay.jpg",
      categorySlug: "beach",
    },
    { source: "manual", actorId: "editor-1" },
    dbInstance,
  );

  trashListing(
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "old-harry-rocks" },
    { source: "manual", actorId: "editor-1" },
    dbInstance,
  );

  const catalog = getRegionListingCatalog(
    { countrySlug: "united-kingdom", regionSlug: "dorset" },
    {
      categorySlug: "natural-attraction",
      tagSlug: "not-a-real-tag",
      destinationSlug: "jurassic-coast",
      busynessRating: 7,
    },
    dbInstance,
  );

  assert.deepEqual(catalog?.appliedFilters, {
    categorySlug: "natural-attraction",
    destinationSlug: "jurassic-coast",
  });
  assert.deepEqual(
    catalog?.listings.map((item) => item.slug),
    ["durdle-door"],
  );
  assert.deepEqual(
    catalog?.facets.categories.map((item) => item.slug),
    ["beach", "mountain", "natural-attraction"],
  );
  assert.ok(!catalog?.facets.tags.some((item) => item.slug === "sunset"));
  assert.ok(catalog?.facets.destinations.some((item) => item.slug === "jurassic-coast" && item.count === 3));
  assert.deepEqual(
    catalog?.facets.busynessRatings.map((item) => item.rating),
    [3, 5],
  );
});

test("region catalog supports category, tag, destination, busyness, and combined filters", (t) => {
  const dbInstance = createSeededTestDb(t);

  const byCategory = getRegionListingCatalog(
    { countrySlug: "united-kingdom", regionSlug: "derbyshire" },
    { categorySlug: "mountain" },
    dbInstance,
  );
  const byTag = getRegionListingCatalog(
    { countrySlug: "united-kingdom", regionSlug: "derbyshire" },
    { tagSlug: "family-friendly" },
    dbInstance,
  );
  const byDestination = getRegionListingCatalog(
    { countrySlug: "united-kingdom", regionSlug: "derbyshire" },
    { destinationSlug: "peak-district-national-park" },
    dbInstance,
  );
  const byBusyness = getRegionListingCatalog(
    { countrySlug: "united-kingdom", regionSlug: "derbyshire" },
    { busynessRating: 5 },
    dbInstance,
  );
  const combined = getRegionListingCatalog(
    { countrySlug: "united-kingdom", regionSlug: "derbyshire" },
    { categorySlug: "mountain", tagSlug: "sunrise", destinationSlug: "peak-district-national-park", busynessRating: 5 },
    dbInstance,
  );

  assert.deepEqual(
    byCategory?.listings.map((item) => item.slug),
    ["mam-tor"],
  );
  assert.deepEqual(
    byTag?.listings.map((item) => item.slug),
    ["ladybower-reservoir", "monsal-trail"],
  );
  assert.deepEqual(
    byDestination?.listings.map((item) => item.slug),
    ["ladybower-reservoir", "mam-tor", "monsal-trail", "stanage-edge"],
  );
  assert.deepEqual(
    byBusyness?.listings.map((item) => item.slug),
    ["mam-tor"],
  );
  assert.deepEqual(
    combined?.listings.map((item) => item.slug),
    ["mam-tor"],
  );
});

test("listing detail hides draft and trashed records and returns related public data", (t) => {
  const dbInstance = createSeededTestDb(t);

  const publicDetail = getListingDetail(
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "durdle-door" },
    dbInstance,
  );

  createListingDraft(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      slug: "draft-detail",
      title: "Draft Detail",
      shortDescription: "Draft short description",
      description: "Draft body",
      latitude: 50.61,
      longitude: -2.21,
      busynessRating: 3,
      coverImage: "https://example.com/draft-detail.jpg",
      categorySlug: "beach",
    },
    { source: "manual", actorId: "editor-1" },
    dbInstance,
  );

  trashListing(
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "lulworth-cove" },
    { source: "manual", actorId: "editor-1" },
    dbInstance,
  );

  const hiddenDraft = getListingDetail(
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "draft-detail" },
    dbInstance,
  );
  const hiddenTrashed = getListingDetail(
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "lulworth-cove" },
    dbInstance,
  );

  assert.equal(publicDetail?.country.slug, "united-kingdom");
  assert.equal(publicDetail?.region.slug, "dorset");
  assert.equal(publicDetail?.category.slug, "natural-attraction");
  assert.equal(publicDetail?.destinations[0]?.slug, "jurassic-coast");
  assert.deepEqual(
    publicDetail?.images.map((item) => item.sortOrder),
    [1, 2],
  );
  assert.deepEqual(
    publicDetail?.tags.map((item) => item.slug),
    ["coastal", "iconic", "photography"],
  );
  assert.equal(hiddenDraft, null);
  assert.equal(hiddenTrashed, null);
});

test("create and update stamp audit metadata, source, and updatedAt", async (t) => {
  const dbInstance = createSeededTestDb(t);

  const created = createListingDraft(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      slug: "audit-trail",
      title: "Audit Trail",
      shortDescription: "Original short description",
      description: "Original description",
      latitude: 50.64,
      longitude: -2.28,
      busynessRating: 2,
      googleMapsPlaceUrl: "https://maps.google.com/?q=audit-trail",
      coverImage: "https://example.com/audit-trail.jpg",
      categorySlug: "trail",
    },
    { source: "manual", actorId: "author-1" },
    dbInstance,
  );

  await new Promise((resolve) => setTimeout(resolve, 1100));

  const updated = updateListingCopyAndMetadata(
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "audit-trail" },
    {
      title: "Audit Trail Updated",
      shortDescription: "Updated short description",
      busynessRating: 4,
    },
    { source: "mcp", actorId: "editor-9" },
    dbInstance,
  );

  assert.equal(created.status, "draft");
  assert.equal(created.createdBy, "author-1");
  assert.equal(created.updatedBy, "author-1");
  assert.equal(created.source, "manual");
  assert.equal(updated.title, "Audit Trail Updated");
  assert.equal(updated.updatedBy, "editor-9");
  assert.equal(updated.source, "mcp");
  assert.ok(updated.updatedAt.getTime() > created.updatedAt.getTime());
});

test("duplicate region-scoped listing slugs fail with a conflict service error", (t) => {
  const dbInstance = createSeededTestDb(t);

  assert.throws(
    () =>
      createListingDraft(
        {
          countrySlug: "united-kingdom",
          regionSlug: "dorset",
          slug: "durdle-door",
          title: "Duplicate Durdle Door",
          shortDescription: "Duplicate slug attempt",
          description: "Duplicate slug attempt",
          latitude: 50.6,
          longitude: -2.2,
          busynessRating: 2,
          coverImage: "https://example.com/duplicate.jpg",
          categorySlug: "beach",
        },
        { source: "manual", actorId: "editor-1" },
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "CONFLICT",
  );
});

test("cross-country destination assignment is rejected", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db
    .insert(countries)
    .values({
      id: "country-france",
      slug: "france",
      title: "France",
      description: "France",
      coverImage: "https://example.com/france.jpg",
    })
    .run();

  dbInstance.db
    .insert(destinations)
    .values({
      id: "destination-alps",
      countryId: "country-france",
      slug: "alps",
      title: "Alps",
      description: "French Alps",
      coverImage: "https://example.com/alps.jpg",
    })
    .run();

  assert.throws(
    () =>
      assignListingDestinations(
        { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "durdle-door" },
        [{ countrySlug: "france", destinationSlug: "alps" }],
        { source: "manual", actorId: "editor-1" },
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "INVALID_INPUT",
  );
});

test("image replacement removes stale rows and returns images in sort order", (t) => {
  const dbInstance = createSeededTestDb(t);

  const result = setListingImages(
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "durdle-door" },
    [
      { imageUrl: "https://example.com/replacement-b.jpg", sortOrder: 2 },
      { imageUrl: "https://example.com/replacement-a.jpg", sortOrder: 1 },
    ],
    { source: "manual", actorId: "editor-2" },
    dbInstance,
  );

  const storedRows = dbInstance.db
    .select({
      imageUrl: listingImages.imageUrl,
      sortOrder: listingImages.sortOrder,
    })
    .from(listingImages)
    .where(eq(listingImages.listingId, result.listing.id))
    .orderBy(asc(listingImages.sortOrder))
    .all();

  assert.equal(result.images.length, 2);
  assert.deepEqual(
    result.images.map((item) => item.imageUrl),
    ["https://example.com/replacement-a.jpg", "https://example.com/replacement-b.jpg"],
  );
  assert.deepEqual(storedRows, [
    { imageUrl: "https://example.com/replacement-a.jpg", sortOrder: 1 },
    { imageUrl: "https://example.com/replacement-b.jpg", sortOrder: 2 },
  ]);
});

test("publish, unpublish, trash, and restore keep lifecycle behavior consistent", (t) => {
  const dbInstance = createSeededTestDb(t);

  createListingDraft(
    {
      countrySlug: "united-kingdom",
      regionSlug: "devon",
      slug: "lifecycle-cove",
      title: "Lifecycle Cove",
      shortDescription: "Lifecycle coverage listing",
      description: "Lifecycle coverage listing body",
      latitude: 50.7,
      longitude: -3.1,
      busynessRating: 1,
      coverImage: "https://example.com/lifecycle.jpg",
      categorySlug: "beach",
    },
    { source: "manual", actorId: "editor-3" },
    dbInstance,
  );

  const published = publishListing(
    { countrySlug: "united-kingdom", regionSlug: "devon", listingSlug: "lifecycle-cove" },
    { source: "manual", actorId: "editor-3" },
    dbInstance,
  );
  const unpublished = unpublishListing(
    { countrySlug: "united-kingdom", regionSlug: "devon", listingSlug: "lifecycle-cove" },
    { source: "manual", actorId: "editor-3" },
    dbInstance,
  );
  const trashed = trashListing(
    { countrySlug: "united-kingdom", regionSlug: "devon", listingSlug: "lifecycle-cove" },
    { source: "manual", actorId: "editor-3" },
    dbInstance,
  );

  assert.equal(published.status, "published");
  assert.equal(unpublished.status, "draft");
  assert.ok(trashed.deletedAt instanceof Date);

  assert.throws(
    () =>
      publishListing(
        { countrySlug: "united-kingdom", regionSlug: "devon", listingSlug: "lifecycle-cove" },
        { source: "manual", actorId: "editor-3" },
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "INVALID_STATE",
  );

  const restored = restoreListing(
    { countrySlug: "united-kingdom", regionSlug: "devon", listingSlug: "lifecycle-cove" },
    { source: "manual", actorId: "editor-3" },
    dbInstance,
  );
  const republished = publishListing(
    { countrySlug: "united-kingdom", regionSlug: "devon", listingSlug: "lifecycle-cove" },
    { source: "manual", actorId: "editor-3" },
    dbInstance,
  );

  assert.equal(restored.deletedAt, null);
  assert.equal(restored.status, "draft");
  assert.equal(republished.status, "published");
});
