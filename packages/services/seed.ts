import { inArray, sql } from "drizzle-orm";

import {
  categories,
  countries,
  destinationRegions,
  destinations,
  getDb,
  listingDestinations,
  listingImages,
  listingStatusValues,
  listings,
  listingTags,
  regions,
  tags,
  type DbInstance,
  type ListingStatus,
} from "@explorers-map/db";

import type { SeedData as SeedDataShape } from "../../seed-data/index.d.ts";
// @ts-expect-error The runtime seed module is JavaScript; we cast it to the shared declaration shape below.
import { seedData as bundledSeedDataSource } from "../../seed-data/index.mjs";

const currentTimestamp = sql`(unixepoch())`;
const listingStatuses = new Set<ListingStatus>(listingStatusValues);

const bundledSeedData = bundledSeedDataSource as SeedDataShape;

export type SeedData = SeedDataShape;

type SeedListingInput = SeedData["listings"][number];

export type NormalizedSeedListing = Omit<
  SeedListingInput,
  "status" | "source" | "createdBy" | "updatedBy" | "deletedAt" | "googleMapsPlaceUrl"
> & {
  status: ListingStatus;
  source: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: string | null;
  googleMapsPlaceUrl: string | null;
};

export type NormalizedSeedData = Omit<SeedData, "listings"> & {
  listings: NormalizedSeedListing[];
};

export type SeedSummary = {
  countries: number;
  regions: number;
  destinations: number;
  destinationRegions: number;
  categories: number;
  tags: number;
  listings: number;
  listingDestinations: number;
  listingImages: number;
  listingTags: number;
};

export type SeedImportResult = {
  filePath: string;
  summary: SeedSummary;
  warnings: string[];
  data: NormalizedSeedData;
};

type SeedSummaryInput = {
  countries: SeedData["countries"];
  regions: SeedData["regions"];
  destinations: SeedData["destinations"];
  destinationRegions: SeedData["destinationRegions"];
  categories: SeedData["categories"];
  tags: SeedData["tags"];
  listings: NormalizedSeedData["listings"];
  listingDestinations: SeedData["listingDestinations"];
  listingImages: SeedData["listingImages"];
  listingTags: SeedData["listingTags"];
};

type SeedWarningsInput = {
  countries: SeedData["countries"];
  regions: SeedData["regions"];
  destinations: SeedData["destinations"];
  listings: NormalizedSeedData["listings"];
  listingImages: SeedData["listingImages"];
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be a non-empty string`);
}

function assertOptionalDateString(value: unknown, label: string): asserts value is string | null | undefined {
  if (value === undefined || value === null) {
    return;
  }

  assertNonEmptyString(value, label);
  assert(!Number.isNaN(Date.parse(value)), `${label} must be a valid date string`);
}

function assertNumberInRange(value: unknown, min: number, max: number, label: string): asserts value is number {
  assert(typeof value === "number" && Number.isFinite(value), `${label} must be a finite number`);
  assert(value >= min && value <= max, `${label} must be between ${min} and ${max}`);
}

function makeScopedKey(...parts: Array<string | number>) {
  return parts.join("::");
}

function validateUnique<T>(items: T[], keyFn: (item: T) => string, label: string) {
  const seen = new Set<string>();

  for (const item of items) {
    const key = keyFn(item);
    assert(!seen.has(key), `Duplicate ${label}: ${key}`);
    seen.add(key);
  }
}

function resolveDeletedAt(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

export function loadSeedData(): SeedData {
  return structuredClone(bundledSeedData);
}

export function validateSeedData(data: SeedData) {
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
    assertNonEmptyString(listing.title, "listing.title");
    assertNonEmptyString(listing.shortDescription, "listing.shortDescription");
    assertNonEmptyString(listing.description, "listing.description");
    assertNonEmptyString(listing.coverImage, "listing.coverImage");
    assertNonEmptyString(listing.categorySlug, "listing.categorySlug");
    assertNumberInRange(listing.latitude, -90, 90, `listing.latitude (${listing.slug})`);
    assertNumberInRange(listing.longitude, -180, 180, `listing.longitude (${listing.slug})`);
    assertNumberInRange(listing.busynessRating, 1, 5, `listing.busynessRating (${listing.slug})`);
    assert(Number.isInteger(listing.busynessRating), `listing.busynessRating (${listing.slug}) must be an integer`);

    if (listing.status !== undefined && listing.status !== null) {
      assertNonEmptyString(listing.status, `listing.status (${listing.slug})`);
      assert(
        listingStatuses.has(listing.status as ListingStatus),
        `listing.status (${listing.slug}) must be one of: ${Array.from(listingStatuses).join(", ")}`,
      );
    }

    if (listing.source !== undefined && listing.source !== null) {
      assertNonEmptyString(listing.source, `listing.source (${listing.slug})`);
    }

    if (listing.createdBy !== undefined && listing.createdBy !== null) {
      assertNonEmptyString(listing.createdBy, `listing.createdBy (${listing.slug})`);
    }

    if (listing.updatedBy !== undefined && listing.updatedBy !== null) {
      assertNonEmptyString(listing.updatedBy, `listing.updatedBy (${listing.slug})`);
    }

    assertOptionalDateString(listing.deletedAt, `listing.deletedAt (${listing.slug})`);

    if (listing.googleMapsPlaceUrl !== undefined && listing.googleMapsPlaceUrl !== null) {
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
  validateUnique(data.listingImages, (image) => image.id, "listing image id");
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

  const countrySlugs = new Set(data.countries.map((country) => country.slug));
  const countrySlugByRegionSlug = new Map<string, string>();
  const countrySlugByDestinationSlug = new Map<string, string>();
  const listingKeys = new Set<string>();
  const categorySlugs = new Set(data.categories.map((category) => category.slug));
  const tagSlugs = new Set(data.tags.map((tag) => tag.slug));
  const destinationRegionSlugs = new Map<string, Set<string>>();

  for (const region of data.regions) {
    assert(countrySlugs.has(region.countrySlug), `Region ${region.slug} references unknown country ${region.countrySlug}`);
    countrySlugByRegionSlug.set(region.slug, region.countrySlug);
  }

  for (const destination of data.destinations) {
    assert(
      countrySlugs.has(destination.countrySlug),
      `Destination ${destination.slug} references unknown country ${destination.countrySlug}`,
    );
    countrySlugByDestinationSlug.set(destination.slug, destination.countrySlug);
  }

  for (const listing of data.listings) {
    assert(
      countrySlugByRegionSlug.has(listing.regionSlug),
      `Listing ${listing.slug} references unknown region ${listing.regionSlug}`,
    );
    assert(categorySlugs.has(listing.categorySlug), `Listing ${listing.slug} references unknown category ${listing.categorySlug}`);
    listingKeys.add(makeScopedKey(listing.regionSlug, listing.slug));
  }

  for (const link of data.destinationRegions) {
    const destinationCountrySlug = countrySlugByDestinationSlug.get(link.destinationSlug);
    const regionCountrySlug = countrySlugByRegionSlug.get(link.regionSlug);

    assert(destinationCountrySlug, `Unknown destination in destinationRegions: ${link.destinationSlug}`);
    assert(regionCountrySlug, `Unknown region in destinationRegions: ${link.regionSlug}`);
    assert(
      destinationCountrySlug === regionCountrySlug,
      `Destination-region link ${link.destinationSlug} -> ${link.regionSlug} crosses countries`,
    );

    const regionSlugs = destinationRegionSlugs.get(link.destinationSlug) ?? new Set<string>();
    regionSlugs.add(link.regionSlug);
    destinationRegionSlugs.set(link.destinationSlug, regionSlugs);
  }

  for (const link of data.listingDestinations) {
    const listingKey = makeScopedKey(link.regionSlug, link.listingSlug);
    const destinationCountrySlug = countrySlugByDestinationSlug.get(link.destinationSlug);
    const listingCountrySlug = countrySlugByRegionSlug.get(link.regionSlug);

    assert(listingKeys.has(listingKey), `Unknown listing in listingDestinations: ${listingKey}`);
    assert(destinationCountrySlug, `Unknown destination in listingDestinations: ${link.destinationSlug}`);
    assert(
      destinationCountrySlug === listingCountrySlug,
      `Listing-destination link ${listingKey} -> ${link.destinationSlug} crosses countries`,
    );

    const allowedRegionSlugs = destinationRegionSlugs.get(link.destinationSlug);
    if (allowedRegionSlugs) {
      assert(
        allowedRegionSlugs.has(link.regionSlug),
        `Listing-destination link ${listingKey} uses destination ${link.destinationSlug} outside its seeded regions`,
      );
    }
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

export function normalizeSeedData(data: SeedData): NormalizedSeedData {
  return {
    ...structuredClone(data),
    listings: data.listings.map((listing) => ({
      ...listing,
      status: (listing.status ?? "published") as ListingStatus,
      source: listing.source ?? "seed",
      createdBy: listing.createdBy ?? null,
      updatedBy: listing.updatedBy ?? null,
      deletedAt: listing.deletedAt ?? null,
      googleMapsPlaceUrl: listing.googleMapsPlaceUrl ?? null,
    })),
  };
}

export function prepareSeedData(data: SeedData = loadSeedData()): NormalizedSeedData {
  validateSeedData(data);
  return normalizeSeedData(data);
}

export function buildSeedSummary(data: SeedSummaryInput): SeedSummary {
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

export function collectSeedWarnings(data: SeedWarningsInput) {
  const warnings: string[] = [];
  const placeholderImages: string[] = [];
  const missingGooglePlaceUrls: string[] = [];
  const listingsWithoutGallery: string[] = [];

  const listingsWithGallery = new Set(
    data.listingImages.map((image) => makeScopedKey(image.regionSlug, image.listingSlug)),
  );

  for (const collectionName of ["countries", "regions", "destinations", "listings"] as const) {
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

export function importPreparedSeedData(data: NormalizedSeedData, dbInstance: DbInstance = getDb()): SeedImportResult {
  const countryIdBySlug = new Map(data.countries.map((country) => [country.slug, country.id]));
  const regionIdBySlug = new Map(data.regions.map((region) => [region.slug, region.id]));
  const destinationIdBySlug = new Map(data.destinations.map((destination) => [destination.slug, destination.id]));
  const listingIdByScopedSlug = new Map(data.listings.map((listing) => [makeScopedKey(listing.regionSlug, listing.slug), listing.id]));
  const tagIdBySlug = new Map(data.tags.map((tag) => [tag.slug, tag.id]));

  dbInstance.db.transaction((tx) => {
    for (const country of data.countries) {
      tx
        .insert(countries)
        .values({
          id: country.id,
          slug: country.slug,
          title: country.title,
          description: country.description,
          coverImage: country.coverImage,
        })
        .onConflictDoUpdate({
          target: countries.id,
          set: {
            slug: country.slug,
            title: country.title,
            description: country.description,
            coverImage: country.coverImage,
            updatedAt: currentTimestamp,
          },
        })
        .run();
    }

    for (const region of data.regions) {
      const countryId = countryIdBySlug.get(region.countrySlug);
      assert(countryId, `Unknown country for region import: ${region.countrySlug}`);

      tx
        .insert(regions)
        .values({
          id: region.id,
          countryId,
          slug: region.slug,
          title: region.title,
          description: region.description,
          coverImage: region.coverImage,
        })
        .onConflictDoUpdate({
          target: regions.id,
          set: {
            countryId,
            slug: region.slug,
            title: region.title,
            description: region.description,
            coverImage: region.coverImage,
            updatedAt: currentTimestamp,
          },
        })
        .run();
    }

    for (const destination of data.destinations) {
      const countryId = countryIdBySlug.get(destination.countrySlug);
      assert(countryId, `Unknown country for destination import: ${destination.countrySlug}`);

      tx
        .insert(destinations)
        .values({
          id: destination.id,
          countryId,
          slug: destination.slug,
          title: destination.title,
          description: destination.description,
          coverImage: destination.coverImage,
        })
        .onConflictDoUpdate({
          target: destinations.id,
          set: {
            countryId,
            slug: destination.slug,
            title: destination.title,
            description: destination.description,
            coverImage: destination.coverImage,
            updatedAt: currentTimestamp,
          },
        })
        .run();
    }

    if (data.destinations.length > 0) {
      tx.delete(destinationRegions).where(inArray(destinationRegions.destinationId, data.destinations.map((destination) => destination.id))).run();
    }

    for (const link of data.destinationRegions) {
      const destinationId = destinationIdBySlug.get(link.destinationSlug);
      const regionId = regionIdBySlug.get(link.regionSlug);

      assert(destinationId, `Unknown destination for destination-region import: ${link.destinationSlug}`);
      assert(regionId, `Unknown region for destination-region import: ${link.regionSlug}`);

      tx.insert(destinationRegions).values({ destinationId, regionId }).run();
    }

    for (const category of data.categories) {
      tx
        .insert(categories)
        .values({
          slug: category.slug,
          title: category.title,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: {
            title: category.title,
          },
        })
        .run();
    }

    for (const tag of data.tags) {
      tx
        .insert(tags)
        .values({
          id: tag.id,
          slug: tag.slug,
          name: tag.name,
        })
        .onConflictDoUpdate({
          target: tags.id,
          set: {
            slug: tag.slug,
            name: tag.name,
            updatedAt: currentTimestamp,
          },
        })
        .run();
    }

    for (const listing of data.listings) {
      const regionId = regionIdBySlug.get(listing.regionSlug);
      assert(regionId, `Unknown region for listing import: ${listing.regionSlug}`);

      tx
        .insert(listings)
        .values({
          id: listing.id,
          regionId,
          slug: listing.slug,
          status: listing.status,
          title: listing.title,
          shortDescription: listing.shortDescription,
          description: listing.description,
          latitude: listing.latitude,
          longitude: listing.longitude,
          busynessRating: listing.busynessRating,
          googleMapsPlaceUrl: listing.googleMapsPlaceUrl,
          coverImage: listing.coverImage,
          categorySlug: listing.categorySlug,
          createdBy: listing.createdBy,
          updatedBy: listing.updatedBy,
          source: listing.source,
          deletedAt: resolveDeletedAt(listing.deletedAt),
        })
        .onConflictDoUpdate({
          target: listings.id,
          set: {
            regionId,
            slug: listing.slug,
            status: listing.status,
            title: listing.title,
            shortDescription: listing.shortDescription,
            description: listing.description,
            latitude: listing.latitude,
            longitude: listing.longitude,
            busynessRating: listing.busynessRating,
            googleMapsPlaceUrl: listing.googleMapsPlaceUrl,
            coverImage: listing.coverImage,
            categorySlug: listing.categorySlug,
            createdBy: listing.createdBy,
            updatedBy: listing.updatedBy,
            source: listing.source,
            deletedAt: resolveDeletedAt(listing.deletedAt),
            updatedAt: currentTimestamp,
          },
        })
        .run();
    }

    if (data.listings.length > 0) {
      const listingIds = data.listings.map((listing) => listing.id);
      tx.delete(listingDestinations).where(inArray(listingDestinations.listingId, listingIds)).run();
      tx.delete(listingImages).where(inArray(listingImages.listingId, listingIds)).run();
      tx.delete(listingTags).where(inArray(listingTags.listingId, listingIds)).run();
    }

    for (const link of data.listingDestinations) {
      const listingId = listingIdByScopedSlug.get(makeScopedKey(link.regionSlug, link.listingSlug));
      const destinationId = destinationIdBySlug.get(link.destinationSlug);

      assert(listingId, `Unknown listing for listing-destination import: ${link.regionSlug}/${link.listingSlug}`);
      assert(destinationId, `Unknown destination for listing-destination import: ${link.destinationSlug}`);

      tx.insert(listingDestinations).values({ listingId, destinationId }).run();
    }

    for (const image of data.listingImages) {
      const listingId = listingIdByScopedSlug.get(makeScopedKey(image.regionSlug, image.listingSlug));
      assert(listingId, `Unknown listing for listing-image import: ${image.regionSlug}/${image.listingSlug}`);

      tx.insert(listingImages).values({
        id: image.id,
        listingId,
        imageUrl: image.imageUrl,
        sortOrder: image.sortOrder,
      }).run();
    }

    for (const tagLink of data.listingTags) {
      const listingId = listingIdByScopedSlug.get(makeScopedKey(tagLink.regionSlug, tagLink.listingSlug));
      const tagId = tagIdBySlug.get(tagLink.tagSlug);

      assert(listingId, `Unknown listing for listing-tag import: ${tagLink.regionSlug}/${tagLink.listingSlug}`);
      assert(tagId, `Unknown tag for listing-tag import: ${tagLink.tagSlug}`);

      tx.insert(listingTags).values({ listingId, tagId }).run();
    }
  });

  return {
    filePath: dbInstance.filePath,
    summary: buildSeedSummary(data),
    warnings: collectSeedWarnings(data),
    data,
  };
}

export function importSeedData(data: SeedData = loadSeedData(), dbInstance: DbInstance = getDb()): SeedImportResult {
  return importPreparedSeedData(prepareSeedData(data), dbInstance);
}
