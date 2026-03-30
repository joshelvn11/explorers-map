import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { seedData } from "../seed-data/index.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "seed-data", "generated");
const outputFile = path.join(outputDir, "seed.snapshot.json");
const listingStatuses = new Set(["draft", "published"]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNonEmptyString(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be a non-empty string`);
}

function assertNumberInRange(value, min, max, label) {
  assert(typeof value === "number" && Number.isFinite(value), `${label} must be a finite number`);
  assert(value >= min && value <= max, `${label} must be between ${min} and ${max}`);
}

function makeScopedKey(...parts) {
  return parts.join("::");
}

function validateUnique(items, keyFn, label) {
  const seen = new Set();

  for (const item of items) {
    const key = keyFn(item);
    assert(!seen.has(key), `Duplicate ${label}: ${key}`);
    seen.add(key);
  }
}

function validateRequiredEntityFields(data) {
  for (const country of data.countries) {
    assertNonEmptyString(country.id, "country.id");
    assertNonEmptyString(country.slug, "country.slug");
    assertNonEmptyString(country.title, "country.title");
    assertNonEmptyString(country.description, "country.description");
    assertNonEmptyString(country.coverImage, "country.coverImage");
  }

  for (const region of data.regions) {
    assertNonEmptyString(region.id, "region.id");
    assertNonEmptyString(region.countrySlug, "region.countrySlug");
    assertNonEmptyString(region.slug, "region.slug");
    assertNonEmptyString(region.title, "region.title");
    assertNonEmptyString(region.description, "region.description");
    assertNonEmptyString(region.coverImage, "region.coverImage");
  }

  for (const destination of data.destinations) {
    assertNonEmptyString(destination.id, "destination.id");
    assertNonEmptyString(destination.countrySlug, "destination.countrySlug");
    assertNonEmptyString(destination.slug, "destination.slug");
    assertNonEmptyString(destination.title, "destination.title");
    assertNonEmptyString(destination.description, "destination.description");
    assertNonEmptyString(destination.coverImage, "destination.coverImage");
  }

  for (const category of data.categories) {
    assertNonEmptyString(category.slug, "category.slug");
    assertNonEmptyString(category.title, "category.title");
  }

  for (const tag of data.tags) {
    assertNonEmptyString(tag.id, "tag.id");
    assertNonEmptyString(tag.slug, "tag.slug");
    assertNonEmptyString(tag.name, "tag.name");
  }

  for (const listing of data.listings) {
    assertNonEmptyString(listing.id, "listing.id");
    assertNonEmptyString(listing.regionSlug, "listing.regionSlug");
    assertNonEmptyString(listing.slug, "listing.slug");
    assertNonEmptyString(listing.status, "listing.status");
    assertNonEmptyString(listing.title, "listing.title");
    assertNonEmptyString(listing.shortDescription, "listing.shortDescription");
    assertNonEmptyString(listing.description, "listing.description");
    assertNonEmptyString(listing.coverImage, "listing.coverImage");
    assertNonEmptyString(listing.categorySlug, "listing.categorySlug");
    assertNonEmptyString(listing.source, "listing.source");
    assertNumberInRange(listing.latitude, -90, 90, `listing.latitude (${listing.slug})`);
    assertNumberInRange(listing.longitude, -180, 180, `listing.longitude (${listing.slug})`);
    assertNumberInRange(listing.busynessRating, 1, 5, `listing.busynessRating (${listing.slug})`);
    assert(Number.isInteger(listing.busynessRating), `listing.busynessRating (${listing.slug}) must be an integer`);
    assert(
      listingStatuses.has(listing.status),
      `listing.status (${listing.slug}) must be one of: ${Array.from(listingStatuses).join(", ")}`,
    );

    if (listing.createdBy !== undefined && listing.createdBy !== null) {
      assertNonEmptyString(listing.createdBy, `listing.createdBy (${listing.slug})`);
    }

    if (listing.updatedBy !== undefined && listing.updatedBy !== null) {
      assertNonEmptyString(listing.updatedBy, `listing.updatedBy (${listing.slug})`);
    }

    if (listing.deletedAt !== undefined && listing.deletedAt !== null) {
      assertNonEmptyString(listing.deletedAt, `listing.deletedAt (${listing.slug})`);
    }

    if (listing.googleMapsPlaceUrl !== undefined) {
      assertNonEmptyString(listing.googleMapsPlaceUrl, `listing.googleMapsPlaceUrl (${listing.slug})`);
      assert(
        listing.googleMapsPlaceUrl.startsWith("https://"),
        `listing.googleMapsPlaceUrl (${listing.slug}) must start with https://`,
      );
    }
  }

  for (const link of data.destinationRegions) {
    assertNonEmptyString(link.destinationSlug, "destinationRegions.destinationSlug");
    assertNonEmptyString(link.regionSlug, "destinationRegions.regionSlug");
  }

  for (const link of data.listingDestinations) {
    assertNonEmptyString(link.regionSlug, "listingDestinations.regionSlug");
    assertNonEmptyString(link.listingSlug, "listingDestinations.listingSlug");
    assertNonEmptyString(link.destinationSlug, "listingDestinations.destinationSlug");
  }

  for (const image of data.listingImages) {
    assertNonEmptyString(image.id, "listingImages.id");
    assertNonEmptyString(image.regionSlug, "listingImages.regionSlug");
    assertNonEmptyString(image.listingSlug, "listingImages.listingSlug");
    assertNonEmptyString(image.imageUrl, "listingImages.imageUrl");
    assertNumberInRange(image.sortOrder, 1, Number.MAX_SAFE_INTEGER, `listingImages.sortOrder (${image.id})`);
    assert(Number.isInteger(image.sortOrder), `listingImages.sortOrder (${image.id}) must be an integer`);
  }

  for (const tagLink of data.listingTags) {
    assertNonEmptyString(tagLink.regionSlug, "listingTags.regionSlug");
    assertNonEmptyString(tagLink.listingSlug, "listingTags.listingSlug");
    assertNonEmptyString(tagLink.tagSlug, "listingTags.tagSlug");
  }
}

function validateRelationships(data) {
  const countrySlugs = new Set(data.countries.map((country) => country.slug));
  const regionKeys = new Set();
  const destinationKeys = new Set();
  const listingKeys = new Set();
  const categorySlugs = new Set(data.categories.map((category) => category.slug));
  const tagSlugs = new Set(data.tags.map((tag) => tag.slug));

  for (const region of data.regions) {
    assert(countrySlugs.has(region.countrySlug), `Region ${region.slug} references unknown country ${region.countrySlug}`);
    regionKeys.add(region.slug);
  }

  for (const destination of data.destinations) {
    assert(
      countrySlugs.has(destination.countrySlug),
      `Destination ${destination.slug} references unknown country ${destination.countrySlug}`,
    );
    destinationKeys.add(destination.slug);
  }

  for (const listing of data.listings) {
    assert(regionKeys.has(listing.regionSlug), `Listing ${listing.slug} references unknown region ${listing.regionSlug}`);
    assert(categorySlugs.has(listing.categorySlug), `Listing ${listing.slug} references unknown category ${listing.categorySlug}`);
    listingKeys.add(makeScopedKey(listing.regionSlug, listing.slug));
  }

  for (const link of data.destinationRegions) {
    assert(destinationKeys.has(link.destinationSlug), `Unknown destination in destinationRegions: ${link.destinationSlug}`);
    assert(regionKeys.has(link.regionSlug), `Unknown region in destinationRegions: ${link.regionSlug}`);
  }

  for (const link of data.listingDestinations) {
    const listingKey = makeScopedKey(link.regionSlug, link.listingSlug);
    assert(listingKeys.has(listingKey), `Unknown listing in listingDestinations: ${listingKey}`);
    assert(destinationKeys.has(link.destinationSlug), `Unknown destination in listingDestinations: ${link.destinationSlug}`);
  }

  for (const image of data.listingImages) {
    const listingKey = makeScopedKey(image.regionSlug, image.listingSlug);
    assert(listingKeys.has(listingKey), `Unknown listing in listingImages: ${listingKey}`);
  }

  for (const tagLink of data.listingTags) {
    const listingKey = makeScopedKey(tagLink.regionSlug, tagLink.listingSlug);
    assert(listingKeys.has(listingKey), `Unknown listing in listingTags: ${listingKey}`);
    assert(tagSlugs.has(tagLink.tagSlug), `Unknown tag in listingTags: ${tagLink.tagSlug}`);
  }
}

function validateUniqueness(data) {
  validateUnique(data.countries, (country) => country.id, "country id");
  validateUnique(data.countries, (country) => country.slug, "country slug");
  validateUnique(data.regions, (region) => region.id, "region id");
  validateUnique(
    data.regions,
    (region) => makeScopedKey(region.countrySlug, region.slug),
    "region slug within country",
  );
  validateUnique(data.destinations, (destination) => destination.id, "destination id");
  validateUnique(
    data.destinations,
    (destination) => makeScopedKey(destination.countrySlug, destination.slug),
    "destination slug within country",
  );
  validateUnique(data.categories, (category) => category.slug, "category slug");
  validateUnique(data.tags, (tag) => tag.id, "tag id");
  validateUnique(data.tags, (tag) => tag.slug, "tag slug");
  validateUnique(data.tags, (tag) => tag.name, "tag name");
  validateUnique(data.listings, (listing) => listing.id, "listing id");
  validateUnique(
    data.listings,
    (listing) => makeScopedKey(listing.regionSlug, listing.slug),
    "listing slug within region",
  );
  validateUnique(
    data.destinationRegions,
    (link) => makeScopedKey(link.destinationSlug, link.regionSlug),
    "destination-region relationship",
  );
  validateUnique(
    data.listingDestinations,
    (link) => makeScopedKey(link.regionSlug, link.listingSlug, link.destinationSlug),
    "listing-destination relationship",
  );
  validateUnique(
    data.listingImages,
    (image) => image.id,
    "listing image id",
  );
  validateUnique(
    data.listingImages,
    (image) => makeScopedKey(image.regionSlug, image.listingSlug, image.imageUrl),
    "listing image",
  );
  validateUnique(
    data.listingImages,
    (image) => makeScopedKey(image.regionSlug, image.listingSlug, image.sortOrder),
    "listing image sort order",
  );
  validateUnique(
    data.listingTags,
    (tagLink) => makeScopedKey(tagLink.regionSlug, tagLink.listingSlug, tagLink.tagSlug),
    "listing tag",
  );
}

function collectWarnings(data) {
  const warnings = [];
  const placeholderImages = [];
  const missingGooglePlaceUrls = [];
  const listingsWithoutGallery = [];

  const listingsWithGallery = new Set(
    data.listingImages.map((image) => makeScopedKey(image.regionSlug, image.listingSlug)),
  );

  for (const collectionName of ["countries", "regions", "destinations", "listings"]) {
    for (const item of data[collectionName]) {
      if (typeof item.coverImage === "string" && item.coverImage.startsWith("/images/seed/")) {
        placeholderImages.push(`${collectionName}.${item.slug ?? item.id}`);
      }
    }
  }

  for (const listing of data.listings) {
    if (!listing.googleMapsPlaceUrl) {
      missingGooglePlaceUrls.push(makeScopedKey(listing.regionSlug, listing.slug));
    }

    const listingKey = makeScopedKey(listing.regionSlug, listing.slug);
    if (!listingsWithGallery.has(listingKey)) {
      listingsWithoutGallery.push(listingKey);
    }
  }

  if (placeholderImages.length > 0) {
    warnings.push(
      `${placeholderImages.length} records still use placeholder local image paths under /images/seed/.`,
    );
  }

  if (missingGooglePlaceUrls.length > 0) {
    warnings.push(
      `${missingGooglePlaceUrls.length} listings do not yet have a Google Maps place link. Coordinates are still present for generated map links.`,
    );
  }

  if (listingsWithoutGallery.length > 0) {
    warnings.push(
      `${listingsWithoutGallery.length} listings do not yet have gallery images, so the detail page gallery will be sparse for those entries.`,
    );
  }

  return warnings;
}

function buildSummary(data) {
  return {
    countries: data.countries.length,
    regions: data.regions.length,
    destinations: data.destinations.length,
    destinationRegions: data.destinationRegions.length,
    categories: data.categories.length,
    tags: data.tags.length,
    listings: data.listings.length,
    listingDestinations: data.listingDestinations.length,
    listingImages: data.listingImages.length,
    listingTags: data.listingTags.length,
  };
}

function main() {
  validateRequiredEntityFields(seedData);
  validateUniqueness(seedData);
  validateRelationships(seedData);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(seedData, null, 2) + "\n", "utf8");

  const summary = buildSummary(seedData);
  const warnings = collectWarnings(seedData);

  console.log("Seed data validated successfully.");
  console.log(`Snapshot written to ${path.relative(projectRoot, outputFile)}`);
  console.log("");
  console.log("Counts:");

  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }

  if (warnings.length > 0) {
    console.log("");
    console.log("Warnings:");

    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main();
