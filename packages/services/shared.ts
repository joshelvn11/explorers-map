import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  categories,
  countries,
  destinations,
  destinationRegions,
  getDb,
  listingDestinations,
  listingImages,
  listings,
  listingTags,
  regions,
  tags,
  type DbInstance,
} from "@explorers-map/db";

import { ServiceError } from "./errors.ts";

export type DbExecutor = DbInstance["db"] | Parameters<Parameters<DbInstance["db"]["transaction"]>[0]>[0];

export type CountryLocator = {
  countrySlug: string;
};

export type RegionLocator = CountryLocator & {
  regionSlug: string;
};

export type DestinationLocator = CountryLocator & {
  destinationSlug: string;
};

export type ListingLocator = RegionLocator & {
  listingSlug: string;
};

export type WriteContext = {
  source: string;
  actorId?: string | null;
};

export type ListingTagSummary = {
  slug: string;
  name: string;
};

export type ListingImageSummary = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

export type ResolvedCountryRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};

export type ResolvedRegionRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  countryId: string;
  countrySlug: string;
  countryTitle: string;
  countryDescription: string;
  countryCoverImage: string;
};

export type ResolvedDestinationRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  countryId: string;
  countrySlug: string;
  countryTitle: string;
  countryDescription: string;
  countryCoverImage: string;
};

export type ResolvedListingRecord = {
  id: string;
  listingSlug: string;
  title: string;
  shortDescription: string;
  description: string;
  coverImage: string;
  categorySlug: string;
  categoryTitle: string;
  status: "draft" | "published";
  latitude: number;
  longitude: number;
  busynessRating: number;
  googleMapsPlaceUrl: string | null;
  source: string;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  regionId: string;
  regionSlug: string;
  regionTitle: string;
  regionDescription: string;
  regionCoverImage: string;
  countryId: string;
  countrySlug: string;
  countryTitle: string;
  countryDescription: string;
  countryCoverImage: string;
};

export function resolveDb(dbInstance?: DbInstance): DbInstance {
  return dbInstance ?? getDb();
}

export function requireNonEmptyString(value: string, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ServiceError("INVALID_INPUT", `${label} must be a non-empty string.`);
  }

  return value.trim();
}

export function requireOptionalString(value: string | null | undefined, label: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return requireNonEmptyString(value, label);
}

export function requireBusynessRating(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new ServiceError("INVALID_INPUT", "busynessRating must be an integer between 1 and 5.");
  }

  return value;
}

export function requireLatitude(value: number): number {
  if (!Number.isFinite(value) || value < -90 || value > 90) {
    throw new ServiceError("INVALID_INPUT", "latitude must be a finite number between -90 and 90.");
  }

  return value;
}

export function requireLongitude(value: number): number {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new ServiceError("INVALID_INPUT", "longitude must be a finite number between -180 and 180.");
  }

  return value;
}

export function requireWriteContext(context: WriteContext): { actorId: string | null; source: string } {
  return {
    actorId: requireOptionalString(context.actorId, "actorId"),
    source: requireNonEmptyString(context.source, "source"),
  };
}

export function assertMutableListing(listing: ResolvedListingRecord) {
  if (listing.deletedAt) {
    throw new ServiceError("INVALID_STATE", "Trashed listings cannot be modified until they are restored.");
  }
}

export function ensureDistinctValues(values: string[], label: string) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new ServiceError("INVALID_INPUT", `Duplicate ${label}: ${value}`);
    }

    seen.add(value);
  }
}

export function mapSqliteError(error: unknown, fallbackMessage: string): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith("SQLITE_CONSTRAINT")
  ) {
    throw new ServiceError("CONFLICT", fallbackMessage);
  }

  throw error;
}

export function toPublicListingVisibilityCondition() {
  return and(eq(listings.status, "published"), isNull(listings.deletedAt));
}

export function loadListingTags(executor: DbExecutor, listingIds: string[]) {
  const tagsByListingId = new Map<string, ListingTagSummary[]>();

  if (listingIds.length === 0) {
    return tagsByListingId;
  }

  const rows = executor
    .select({
      listingId: listingTags.listingId,
      slug: tags.slug,
      name: tags.name,
    })
    .from(listingTags)
    .innerJoin(tags, eq(listingTags.tagId, tags.id))
    .where(inArray(listingTags.listingId, listingIds))
    .orderBy(asc(tags.name))
    .all();

  for (const row of rows) {
    const bucket = tagsByListingId.get(row.listingId) ?? [];
    bucket.push({ slug: row.slug, name: row.name });
    tagsByListingId.set(row.listingId, bucket);
  }

  return tagsByListingId;
}

export function loadListingImages(executor: DbExecutor, listingId: string): ListingImageSummary[] {
  return executor
    .select({
      id: listingImages.id,
      imageUrl: listingImages.imageUrl,
      sortOrder: listingImages.sortOrder,
    })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(asc(listingImages.sortOrder))
    .all();
}

export function loadListingDestinations(executor: DbExecutor, listingId: string) {
  return executor
    .select({
      slug: destinations.slug,
      title: destinations.title,
    })
    .from(listingDestinations)
    .innerJoin(destinations, eq(listingDestinations.destinationId, destinations.id))
    .where(eq(listingDestinations.listingId, listingId))
    .orderBy(asc(destinations.title))
    .all();
}

export function loadListingDestinationsForListings(executor: DbExecutor, listingIds: string[]) {
  const destinationsByListingId = new Map<string, Array<{ slug: string; title: string }>>();

  if (listingIds.length === 0) {
    return destinationsByListingId;
  }

  const rows = executor
    .select({
      listingId: listingDestinations.listingId,
      slug: destinations.slug,
      title: destinations.title,
    })
    .from(listingDestinations)
    .innerJoin(destinations, eq(listingDestinations.destinationId, destinations.id))
    .where(inArray(listingDestinations.listingId, listingIds))
    .orderBy(asc(destinations.title))
    .all();

  for (const row of rows) {
    const bucket = destinationsByListingId.get(row.listingId) ?? [];
    bucket.push({ slug: row.slug, title: row.title });
    destinationsByListingId.set(row.listingId, bucket);
  }

  return destinationsByListingId;
}

export function loadDestinationRegions(executor: DbExecutor, destinationId: string) {
  return executor
    .select({
      slug: regions.slug,
      title: regions.title,
    })
    .from(destinationRegions)
    .innerJoin(regions, eq(destinationRegions.regionId, regions.id))
    .where(eq(destinationRegions.destinationId, destinationId))
    .orderBy(asc(regions.title))
    .all();
}

export function resolveCountryRecord(executor: DbExecutor, countrySlug: string): ResolvedCountryRecord | null {
  const normalizedCountrySlug = requireNonEmptyString(countrySlug, "countrySlug");
  const row = executor
    .select({
      id: countries.id,
      slug: countries.slug,
      title: countries.title,
      description: countries.description,
      coverImage: countries.coverImage,
    })
    .from(countries)
    .where(eq(countries.slug, normalizedCountrySlug))
    .limit(1)
    .get();

  return row ?? null;
}

export function resolveRegionRecord(executor: DbExecutor, locator: RegionLocator): ResolvedRegionRecord | null {
  const countrySlug = requireNonEmptyString(locator.countrySlug, "countrySlug");
  const regionSlug = requireNonEmptyString(locator.regionSlug, "regionSlug");

  const row = executor
    .select({
      id: regions.id,
      slug: regions.slug,
      title: regions.title,
      description: regions.description,
      coverImage: regions.coverImage,
      countryId: countries.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      countryDescription: countries.description,
      countryCoverImage: countries.coverImage,
    })
    .from(regions)
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(and(eq(countries.slug, countrySlug), eq(regions.slug, regionSlug)))
    .limit(1)
    .get();

  return row ?? null;
}

export function resolveRegionRecordById(executor: DbExecutor, regionId: string): ResolvedRegionRecord | null {
  const normalizedRegionId = requireNonEmptyString(regionId, "regionId");

  const row = executor
    .select({
      id: regions.id,
      slug: regions.slug,
      title: regions.title,
      description: regions.description,
      coverImage: regions.coverImage,
      countryId: countries.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      countryDescription: countries.description,
      countryCoverImage: countries.coverImage,
    })
    .from(regions)
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(eq(regions.id, normalizedRegionId))
    .limit(1)
    .get();

  return row ?? null;
}

export function resolveDestinationRecord(
  executor: DbExecutor,
  locator: DestinationLocator,
): ResolvedDestinationRecord | null {
  const countrySlug = requireNonEmptyString(locator.countrySlug, "countrySlug");
  const destinationSlug = requireNonEmptyString(locator.destinationSlug, "destinationSlug");

  const row = executor
    .select({
      id: destinations.id,
      slug: destinations.slug,
      title: destinations.title,
      description: destinations.description,
      coverImage: destinations.coverImage,
      countryId: countries.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      countryDescription: countries.description,
      countryCoverImage: countries.coverImage,
    })
    .from(destinations)
    .innerJoin(countries, eq(destinations.countryId, countries.id))
    .where(and(eq(countries.slug, countrySlug), eq(destinations.slug, destinationSlug)))
    .limit(1)
    .get();

  return row ?? null;
}

export function resolveCategoryRecord(executor: DbExecutor, categorySlug: string) {
  const normalizedCategorySlug = requireNonEmptyString(categorySlug, "categorySlug");
  const row = executor
    .select({
      slug: categories.slug,
      title: categories.title,
    })
    .from(categories)
    .where(eq(categories.slug, normalizedCategorySlug))
    .limit(1)
    .get();

  return row ?? null;
}

export function resolveListingRecord(executor: DbExecutor, locator: ListingLocator): ResolvedListingRecord | null {
  const countrySlug = requireNonEmptyString(locator.countrySlug, "countrySlug");
  const regionSlug = requireNonEmptyString(locator.regionSlug, "regionSlug");
  const listingSlug = requireNonEmptyString(locator.listingSlug, "listingSlug");

  const row = executor
    .select({
      id: listings.id,
      listingSlug: listings.slug,
      title: listings.title,
      shortDescription: listings.shortDescription,
      description: listings.description,
      coverImage: listings.coverImage,
      categorySlug: listings.categorySlug,
      categoryTitle: categories.title,
      status: listings.status,
      latitude: listings.latitude,
      longitude: listings.longitude,
      busynessRating: listings.busynessRating,
      googleMapsPlaceUrl: listings.googleMapsPlaceUrl,
      source: listings.source,
      createdBy: listings.createdBy,
      updatedBy: listings.updatedBy,
      deletedAt: listings.deletedAt,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      regionId: regions.id,
      regionSlug: regions.slug,
      regionTitle: regions.title,
      regionDescription: regions.description,
      regionCoverImage: regions.coverImage,
      countryId: countries.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      countryDescription: countries.description,
      countryCoverImage: countries.coverImage,
    })
    .from(listings)
    .innerJoin(regions, eq(listings.regionId, regions.id))
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .innerJoin(categories, eq(listings.categorySlug, categories.slug))
    .where(and(eq(countries.slug, countrySlug), eq(regions.slug, regionSlug), eq(listings.slug, listingSlug)))
    .limit(1)
    .get();

  return row ?? null;
}

export function resolveListingRecordById(executor: DbExecutor, listingId: string): ResolvedListingRecord | null {
  const normalizedListingId = requireNonEmptyString(listingId, "listingId");

  const row = executor
    .select({
      id: listings.id,
      listingSlug: listings.slug,
      title: listings.title,
      shortDescription: listings.shortDescription,
      description: listings.description,
      coverImage: listings.coverImage,
      categorySlug: listings.categorySlug,
      categoryTitle: categories.title,
      status: listings.status,
      latitude: listings.latitude,
      longitude: listings.longitude,
      busynessRating: listings.busynessRating,
      googleMapsPlaceUrl: listings.googleMapsPlaceUrl,
      source: listings.source,
      createdBy: listings.createdBy,
      updatedBy: listings.updatedBy,
      deletedAt: listings.deletedAt,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      regionId: regions.id,
      regionSlug: regions.slug,
      regionTitle: regions.title,
      regionDescription: regions.description,
      regionCoverImage: regions.coverImage,
      countryId: countries.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      countryDescription: countries.description,
      countryCoverImage: countries.coverImage,
    })
    .from(listings)
    .innerJoin(regions, eq(listings.regionId, regions.id))
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .innerJoin(categories, eq(listings.categorySlug, categories.slug))
    .where(eq(listings.id, normalizedListingId))
    .limit(1)
    .get();

  return row ?? null;
}

export function requireCountryRecord(executor: DbExecutor, countrySlug: string): ResolvedCountryRecord {
  const row = resolveCountryRecord(executor, countrySlug);

  if (!row) {
    throw new ServiceError("NOT_FOUND", `Country "${countrySlug}" was not found.`);
  }

  return row;
}

export function requireRegionRecord(executor: DbExecutor, locator: RegionLocator): ResolvedRegionRecord {
  const row = resolveRegionRecord(executor, locator);

  if (!row) {
    throw new ServiceError(
      "NOT_FOUND",
      `Region "${locator.regionSlug}" was not found in country "${locator.countrySlug}".`,
    );
  }

  return row;
}

export function requireRegionRecordById(executor: DbExecutor, regionId: string): ResolvedRegionRecord {
  const row = resolveRegionRecordById(executor, regionId);

  if (!row) {
    throw new ServiceError("NOT_FOUND", `Region "${regionId}" was not found.`);
  }

  return row;
}

export function requireDestinationRecord(executor: DbExecutor, locator: DestinationLocator): ResolvedDestinationRecord {
  const row = resolveDestinationRecord(executor, locator);

  if (!row) {
    throw new ServiceError(
      "NOT_FOUND",
      `Destination "${locator.destinationSlug}" was not found in country "${locator.countrySlug}".`,
    );
  }

  return row;
}

export function requireCategoryRecord(executor: DbExecutor, categorySlug: string) {
  const row = resolveCategoryRecord(executor, categorySlug);

  if (!row) {
    throw new ServiceError("INVALID_INPUT", `Category "${categorySlug}" does not exist.`);
  }

  return row;
}

export function requireListingRecord(executor: DbExecutor, locator: ListingLocator): ResolvedListingRecord {
  const row = resolveListingRecord(executor, locator);

  if (!row) {
    throw new ServiceError(
      "NOT_FOUND",
      `Listing "${locator.listingSlug}" was not found in region "${locator.regionSlug}" for country "${locator.countrySlug}".`,
    );
  }

  return row;
}

export function requireListingRecordById(executor: DbExecutor, listingId: string): ResolvedListingRecord {
  const row = resolveListingRecordById(executor, listingId);

  if (!row) {
    throw new ServiceError("NOT_FOUND", `Listing "${listingId}" was not found.`);
  }

  return row;
}
