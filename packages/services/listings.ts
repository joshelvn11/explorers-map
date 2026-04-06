import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import {
  categories,
  listingDestinations,
  listingImages,
  listings,
  regions,
  type DbInstance,
} from "@explorers-map/db";

import { ServiceError } from "./errors.ts";
import {
  assertMutableListing,
  ensureDistinctValues,
  loadListingDestinations,
  loadListingDestinationsForListings,
  loadListingImages,
  loadListingTags,
  mapSqliteError,
  requireBusynessRating,
  requireCategoryRecord,
  requireDestinationRecord,
  requireLatitude,
  requireListingRecord,
  requireListingRecordById,
  requireLongitude,
  requireNonEmptyString,
  requireOptionalString,
  requireRegionRecord,
  requireWriteContext,
  resolveDb,
  resolveListingRecord,
  toPublicListingVisibilityCondition,
  type DestinationLocator,
  type ListingImageSummary,
  type ListingLocator,
  type ListingTagSummary,
  type ResolvedListingRecord,
  type WriteContext,
} from "./shared.ts";

export type ListingCategorySummary = {
  slug: string;
  title: string;
};

export type ListingRegionSummary = {
  slug: string;
  title: string;
};

export type ListingDestinationSummary = {
  slug: string;
  title: string;
};

export type ListingSummary = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  coverImage: string;
  busynessRating: number;
  latitude: number;
  longitude: number;
  googleMapsPlaceUrl: string | null;
  category: ListingCategorySummary;
  region: ListingRegionSummary;
  tags: ListingTagSummary[];
};

export type ListingDetail = ListingSummary & {
  description: string;
  country: {
    slug: string;
    title: string;
  };
  images: ListingImageSummary[];
  destinations: ListingDestinationSummary[];
};

export type RegionListingCatalogFilters = {
  categorySlug?: string;
  tagSlug?: string;
  destinationSlug?: string;
  busynessRating?: number;
};

export type RegionListingCatalogCategoryFacet = {
  slug: string;
  title: string;
  count: number;
};

export type RegionListingCatalogTagFacet = {
  slug: string;
  name: string;
  count: number;
};

export type RegionListingCatalogDestinationFacet = {
  slug: string;
  title: string;
  count: number;
};

export type RegionListingCatalogBusynessFacet = {
  rating: number;
  count: number;
};

export type RegionListingCatalogResult = {
  region: {
    countrySlug: string;
    slug: string;
    title: string;
    description: string;
    coverImage: string;
    country: {
      slug: string;
      title: string;
      description: string;
      coverImage: string;
    };
  };
  appliedFilters: RegionListingCatalogFilters;
  facets: {
    categories: RegionListingCatalogCategoryFacet[];
    tags: RegionListingCatalogTagFacet[];
    destinations: RegionListingCatalogDestinationFacet[];
    busynessRatings: RegionListingCatalogBusynessFacet[];
  };
  listings: ListingSummary[];
};

export type CreateListingDraftInput = {
  countrySlug: string;
  regionSlug: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  busynessRating?: number | null;
  googleMapsPlaceUrl?: string | null;
  coverImage?: string | null;
  categorySlug?: string | null;
};

export type UpdateListingCopyAndMetadataInput = Partial<
  Pick<
    CreateListingDraftInput,
    "slug" | "title" | "shortDescription" | "description" | "coverImage" | "categorySlug" | "busynessRating"
  >
>;

export type SetListingLocationInput = {
  latitude?: number | null;
  longitude?: number | null;
  googleMapsPlaceUrl?: string | null;
};

export type SetListingImagesInput = {
  imageUrl: string;
  sortOrder: number;
};

export type ListingMutationResult = {
  id: string;
  countrySlug: string;
  regionSlug: string;
  listingSlug: string;
  title: string;
  status: "draft" | "published";
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  source: string;
};

export type ListingDestinationsMutationResult = {
  listing: ListingMutationResult;
  destinations: ListingDestinationSummary[];
};

export type ListingImagesMutationResult = {
  listing: ListingMutationResult;
  images: ListingImageSummary[];
};

type PublicListingRow = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  coverImage: string | null;
  busynessRating: number | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsPlaceUrl: string | null;
  categorySlug: string | null;
  categoryTitle: string | null;
  regionSlug: string;
  regionTitle: string;
};

type CompletePublicListingRow = Omit<PublicListingRow, "coverImage" | "busynessRating" | "latitude" | "longitude" | "categorySlug" | "categoryTitle"> & {
  coverImage: string;
  busynessRating: number;
  latitude: number;
  longitude: number;
  categorySlug: string;
  categoryTitle: string;
};

export function listListingsForRegion(locator: Pick<ListingLocator, "countrySlug" | "regionSlug">, dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);
  const region = requireRegionForPublicList(locator, dbInstance);

  if (!region) {
    return [];
  }

  const rows = db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      shortDescription: listings.shortDescription,
      coverImage: listings.coverImage,
      busynessRating: listings.busynessRating,
      latitude: listings.latitude,
      longitude: listings.longitude,
      googleMapsPlaceUrl: listings.googleMapsPlaceUrl,
      categorySlug: listings.categorySlug,
      categoryTitle: categories.title,
      regionSlug: regions.slug,
      regionTitle: regions.title,
    })
    .from(listings)
    .innerJoin(categories, eq(listings.categorySlug, categories.slug))
    .innerJoin(regions, eq(listings.regionId, regions.id))
    .where(and(eq(listings.regionId, region.id), toPublicListingVisibilityCondition()))
    .orderBy(asc(listings.title))
    .all();

  return attachTagsToListings(db, filterCompletePublicListingRows(rows));
}

export function listListingsForDestination(
  locator: DestinationLocator,
  dbInstance?: DbInstance,
): ListingSummary[] {
  const { db } = resolveDb(dbInstance);
  const destination = resolveDestinationForPublicList(locator, dbInstance);

  if (!destination) {
    return [];
  }

  const rows = db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      shortDescription: listings.shortDescription,
      coverImage: listings.coverImage,
      busynessRating: listings.busynessRating,
      latitude: listings.latitude,
      longitude: listings.longitude,
      googleMapsPlaceUrl: listings.googleMapsPlaceUrl,
      categorySlug: listings.categorySlug,
      categoryTitle: categories.title,
      regionSlug: regions.slug,
      regionTitle: regions.title,
    })
    .from(listingDestinations)
    .innerJoin(listings, eq(listingDestinations.listingId, listings.id))
    .innerJoin(categories, eq(listings.categorySlug, categories.slug))
    .innerJoin(regions, eq(listings.regionId, regions.id))
    .where(
      and(
        eq(listingDestinations.destinationId, destination.id),
        eq(regions.countryId, destination.countryId),
        toPublicListingVisibilityCondition(),
      ),
    )
    .orderBy(asc(listings.title))
    .all();

  return attachTagsToListings(db, filterCompletePublicListingRows(rows));
}

export function getRegionListingCatalog(
  locator: Pick<ListingLocator, "countrySlug" | "regionSlug">,
  filters: RegionListingCatalogFilters = {},
  dbInstance?: DbInstance,
): RegionListingCatalogResult | null {
  const { db } = resolveDb(dbInstance);
  const region = requireRegionForPublicList(locator, dbInstance);

  if (!region) {
    return null;
  }

  const rows = db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      shortDescription: listings.shortDescription,
      coverImage: listings.coverImage,
      busynessRating: listings.busynessRating,
      latitude: listings.latitude,
      longitude: listings.longitude,
      googleMapsPlaceUrl: listings.googleMapsPlaceUrl,
      categorySlug: listings.categorySlug,
      categoryTitle: categories.title,
      regionSlug: regions.slug,
      regionTitle: regions.title,
    })
    .from(listings)
    .innerJoin(categories, eq(listings.categorySlug, categories.slug))
    .innerJoin(regions, eq(listings.regionId, regions.id))
    .where(and(eq(listings.regionId, region.id), toPublicListingVisibilityCondition()))
    .orderBy(asc(listings.title))
    .all();

  const entries = attachMetadataToRegionCatalogEntries(db, filterCompletePublicListingRows(rows));
  const appliedFilters = normalizeRegionCatalogFilters(filters, entries);

  return {
    region: {
      countrySlug: region.countrySlug,
      slug: region.slug,
      title: region.title,
      description: region.description,
      coverImage: region.coverImage,
      country: {
        slug: region.countrySlug,
        title: region.countryTitle,
        description: region.countryDescription,
        coverImage: region.countryCoverImage,
      },
    },
    appliedFilters,
    facets: buildRegionCatalogFacets(entries),
    listings: filterRegionCatalogEntries(entries, appliedFilters).map(({ destinations: _destinations, ...listing }) => listing),
  };
}

export function getListingDetail(locator: ListingLocator, dbInstance?: DbInstance): ListingDetail | null {
  const { db } = resolveDb(dbInstance);
  const listing = requirePublicListingRecord(locator, dbInstance);

  if (!listing) {
    return null;
  }

  const completeListing = listing as ResolvedListingRecord & {
    coverImage: string;
    categorySlug: string;
    categoryTitle: string;
    latitude: number;
    longitude: number;
    busynessRating: number;
  };

  const tags = loadListingTags(db, [completeListing.id]).get(completeListing.id) ?? [];

  return {
    id: completeListing.id,
    slug: completeListing.listingSlug,
    title: completeListing.title,
    shortDescription: completeListing.shortDescription,
    description: completeListing.description,
    coverImage: completeListing.coverImage,
    busynessRating: completeListing.busynessRating,
    latitude: completeListing.latitude,
    longitude: completeListing.longitude,
    googleMapsPlaceUrl: completeListing.googleMapsPlaceUrl,
    category: {
      slug: completeListing.categorySlug,
      title: completeListing.categoryTitle,
    },
    region: {
      slug: completeListing.regionSlug,
      title: completeListing.regionTitle,
    },
    country: {
      slug: completeListing.countrySlug,
      title: completeListing.countryTitle,
    },
    tags,
    images: loadListingImages(db, completeListing.id),
    destinations: loadListingDestinations(db, completeListing.id),
  };
}

export function createListingDraft(
  input: CreateListingDraftInput,
  context: WriteContext,
  dbInstance?: DbInstance,
): ListingMutationResult {
  const { db } = resolveDb(dbInstance);
  const region = requireRegionRecord(db, input);
  const now = new Date();
  const writeContext = requireWriteContext(context);
  const nextSlug = requireNonEmptyString(input.slug, "slug");
  const nextCategorySlug = normalizeOptionalCategorySlug(db, input.categorySlug);
  const nextCoverImage = requireOptionalString(input.coverImage, "coverImage");
  const nextBusynessRating = normalizeOptionalBusynessRating(input.busynessRating);
  const { latitude, longitude } = normalizeOptionalCoordinates(input.latitude, input.longitude);

  requireNonEmptyString(input.title, "title");
  requireNonEmptyString(input.shortDescription, "shortDescription");
  requireNonEmptyString(input.description, "description");
  requireOptionalString(input.googleMapsPlaceUrl, "googleMapsPlaceUrl");
  ensureListingSlugAvailable(db, region.id, nextSlug);

  try {
    const id = db.transaction((tx) => {
      const listingId = randomUUID();

      tx.insert(listings).values({
        id: listingId,
        regionId: region.id,
        slug: nextSlug,
        status: "draft",
        title: input.title.trim(),
        shortDescription: input.shortDescription.trim(),
        description: input.description.trim(),
        latitude,
        longitude,
        busynessRating: nextBusynessRating,
        googleMapsPlaceUrl: requireOptionalString(input.googleMapsPlaceUrl, "googleMapsPlaceUrl"),
        coverImage: nextCoverImage,
        categorySlug: nextCategorySlug,
        createdBy: writeContext.actorId,
        updatedBy: writeContext.actorId,
        source: writeContext.source,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      }).run();

      return listingId;
    });

    return toListingMutationResult(requireListingRecordById(db, id));
  } catch (error) {
    mapSqliteError(error, `Listing slug "${nextSlug}" already exists in region "${region.slug}".`);
  }
}

export function updateListingCopyAndMetadata(
  locator: ListingLocator,
  patch: UpdateListingCopyAndMetadataInput,
  context: WriteContext,
  dbInstance?: DbInstance,
): ListingMutationResult {
  const { db } = resolveDb(dbInstance);
  const listing = requireListingRecord(db, locator);
  const writeContext = requireWriteContext(context);
  const now = new Date();

  assertMutableListing(listing);

  if (Object.keys(patch).length === 0) {
    throw new ServiceError("INVALID_INPUT", "At least one copy or metadata field must be provided.");
  }

  const nextSlug = patch.slug === undefined ? listing.listingSlug : requireNonEmptyString(patch.slug, "slug");
  const nextTitle = patch.title === undefined ? listing.title : requireNonEmptyString(patch.title, "title");
  const nextShortDescription =
    patch.shortDescription === undefined
      ? listing.shortDescription
      : requireNonEmptyString(patch.shortDescription, "shortDescription");
  const nextDescription =
    patch.description === undefined ? listing.description : requireNonEmptyString(patch.description, "description");
  const nextCoverImage =
    patch.coverImage === undefined ? listing.coverImage : requireOptionalString(patch.coverImage, "coverImage");
  const nextCategorySlug =
    patch.categorySlug === undefined ? listing.categorySlug : normalizeOptionalCategorySlug(db, patch.categorySlug);
  const nextBusynessRating =
    patch.busynessRating === undefined ? listing.busynessRating : normalizeOptionalBusynessRating(patch.busynessRating);

  ensureListingSlugAvailable(db, listing.regionId, nextSlug, listing.id);

  try {
    db.update(listings)
      .set({
        slug: nextSlug,
        title: nextTitle,
        shortDescription: nextShortDescription,
        description: nextDescription,
        coverImage: nextCoverImage,
        categorySlug: nextCategorySlug,
        busynessRating: nextBusynessRating,
        updatedBy: writeContext.actorId,
        source: writeContext.source,
        updatedAt: now,
      })
      .where(eq(listings.id, listing.id))
      .run();
  } catch (error) {
    mapSqliteError(error, `Listing slug "${nextSlug}" already exists in region "${listing.regionSlug}".`);
  }

  return toListingMutationResult(requireListingRecordById(db, listing.id));
}

export function setListingLocation(
  locator: ListingLocator,
  input: SetListingLocationInput,
  context: WriteContext,
  dbInstance?: DbInstance,
): ListingMutationResult {
  const { db } = resolveDb(dbInstance);
  const listing = requireListingRecord(db, locator);
  const writeContext = requireWriteContext(context);
  const now = new Date();
  const { latitude, longitude } = normalizeOptionalCoordinates(input.latitude, input.longitude);

  assertMutableListing(listing);

  db.update(listings)
    .set({
      latitude,
      longitude,
      googleMapsPlaceUrl: requireOptionalString(input.googleMapsPlaceUrl, "googleMapsPlaceUrl"),
      updatedBy: writeContext.actorId,
      source: writeContext.source,
      updatedAt: now,
    })
    .where(eq(listings.id, listing.id))
    .run();

  return toListingMutationResult(requireListingRecordById(db, listing.id));
}

export function assignListingDestinations(
  locator: ListingLocator,
  destinationLocators: DestinationLocator[],
  context: WriteContext,
  dbInstance?: DbInstance,
): ListingDestinationsMutationResult {
  const { db } = resolveDb(dbInstance);
  const listing = requireListingRecord(db, locator);
  const writeContext = requireWriteContext(context);
  const now = new Date();

  assertMutableListing(listing);

  ensureDistinctValues(
    destinationLocators.map((item) => `${item.countrySlug}::${item.destinationSlug}`),
    "destination locator",
  );

  const destinationsToAssign = destinationLocators.map((destinationLocator) => {
    if (destinationLocator.countrySlug !== listing.countrySlug) {
      throw new ServiceError(
        "INVALID_INPUT",
        `Destination "${destinationLocator.destinationSlug}" is not in listing country "${listing.countrySlug}".`,
      );
    }

    return requireDestinationRecord(db, destinationLocator);
  });

  db.transaction((tx) => {
    tx.delete(listingDestinations).where(eq(listingDestinations.listingId, listing.id)).run();

    if (destinationsToAssign.length > 0) {
      tx.insert(listingDestinations)
        .values(
          destinationsToAssign.map((destination) => ({
            listingId: listing.id,
            destinationId: destination.id,
          })),
        )
        .run();
    }

    tx.update(listings)
      .set({
        updatedBy: writeContext.actorId,
        source: writeContext.source,
        updatedAt: now,
      })
      .where(eq(listings.id, listing.id))
      .run();
  });

  return {
    listing: toListingMutationResult(requireListingRecordById(db, listing.id)),
    destinations: loadListingDestinations(db, listing.id),
  };
}

export function setListingImages(
  locator: ListingLocator,
  images: SetListingImagesInput[],
  context: WriteContext,
  dbInstance?: DbInstance,
): ListingImagesMutationResult {
  const { db } = resolveDb(dbInstance);
  const listing = requireListingRecord(db, locator);
  const writeContext = requireWriteContext(context);
  const now = new Date();

  assertMutableListing(listing);
  validateListingImages(images);

  db.transaction((tx) => {
    tx.delete(listingImages).where(eq(listingImages.listingId, listing.id)).run();

    if (images.length > 0) {
      tx.insert(listingImages)
        .values(
          images.map((image) => ({
            id: randomUUID(),
            listingId: listing.id,
            imageUrl: requireNonEmptyString(image.imageUrl, "imageUrl"),
            sortOrder: image.sortOrder,
          })),
        )
        .run();
    }

    tx.update(listings)
      .set({
        updatedBy: writeContext.actorId,
        source: writeContext.source,
        updatedAt: now,
      })
      .where(eq(listings.id, listing.id))
      .run();
  });

  return {
    listing: toListingMutationResult(requireListingRecordById(db, listing.id)),
    images: loadListingImages(db, listing.id),
  };
}

export function publishListing(locator: ListingLocator, context: WriteContext, dbInstance?: DbInstance) {
  return setListingStatus(locator, "published", context, dbInstance);
}

export function unpublishListing(locator: ListingLocator, context: WriteContext, dbInstance?: DbInstance) {
  return setListingStatus(locator, "draft", context, dbInstance);
}

export function trashListing(locator: ListingLocator, context: WriteContext, dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);
  const listing = requireListingRecord(db, locator);

  if (listing.deletedAt) {
    return toListingMutationResult(listing);
  }

  const writeContext = requireWriteContext(context);
  const now = new Date();

  db.update(listings)
    .set({
      deletedAt: now,
      updatedBy: writeContext.actorId,
      source: writeContext.source,
      updatedAt: now,
    })
    .where(eq(listings.id, listing.id))
    .run();

  return toListingMutationResult(requireListingRecordById(db, listing.id));
}

export function restoreListing(locator: ListingLocator, context: WriteContext, dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);
  const listing = requireListingRecord(db, locator);

  if (!listing.deletedAt) {
    return toListingMutationResult(listing);
  }

  const writeContext = requireWriteContext(context);
  const now = new Date();

  db.update(listings)
    .set({
      deletedAt: null,
      updatedBy: writeContext.actorId,
      source: writeContext.source,
      updatedAt: now,
    })
    .where(eq(listings.id, listing.id))
    .run();

  return toListingMutationResult(requireListingRecordById(db, listing.id));
}

function requireRegionForPublicList(locator: Pick<ListingLocator, "countrySlug" | "regionSlug">, dbInstance?: DbInstance) {
  try {
    const { db } = resolveDb(dbInstance);
    return requireRegionRecord(db, locator);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      return null;
    }

    throw error;
  }
}

function resolveDestinationForPublicList(locator: DestinationLocator, dbInstance?: DbInstance) {
  try {
    const { db } = resolveDb(dbInstance);
    return requireDestinationRecord(db, locator);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      return null;
    }

    throw error;
  }
}

function requirePublicListingRecord(locator: ListingLocator, dbInstance?: DbInstance): ResolvedListingRecord | null {
  const { db } = resolveDb(dbInstance);
  const listing = resolveListingRecord(db, locator);

  if (!listing) {
    return null;
  }

  if (listing.status !== "published" || listing.deletedAt) {
    return null;
  }

  if (
    listing.coverImage === null ||
    listing.categorySlug === null ||
    listing.categoryTitle === null ||
    listing.latitude === null ||
    listing.longitude === null ||
    listing.busynessRating === null
  ) {
    return null;
  }

  return listing;
}

function filterCompletePublicListingRows(rows: PublicListingRow[]): CompletePublicListingRow[] {
  return rows.filter((row): row is CompletePublicListingRow => (
    row.coverImage !== null &&
    row.busynessRating !== null &&
    row.latitude !== null &&
    row.longitude !== null &&
    row.categorySlug !== null &&
    row.categoryTitle !== null
  ));
}

function attachTagsToListings(
  db: DbInstance["db"],
  rows: CompletePublicListingRow[],
): ListingSummary[] {
  const tagsByListingId = loadListingTags(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    coverImage: row.coverImage,
    busynessRating: row.busynessRating,
    latitude: row.latitude,
    longitude: row.longitude,
    googleMapsPlaceUrl: row.googleMapsPlaceUrl,
    category: {
      slug: row.categorySlug,
      title: row.categoryTitle,
    },
    region: {
      slug: row.regionSlug,
      title: row.regionTitle,
    },
    tags: tagsByListingId.get(row.id) ?? [],
  }));
}

function attachMetadataToRegionCatalogEntries(
  db: DbInstance["db"],
  rows: CompletePublicListingRow[],
): Array<ListingSummary & { destinations: ListingDestinationSummary[] }> {
  const tagsByListingId = loadListingTags(
    db,
    rows.map((row) => row.id),
  );
  const destinationsByListingId = loadListingDestinationsForListings(
    db,
    rows.map((row) => row.id),
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    coverImage: row.coverImage,
    busynessRating: row.busynessRating,
    latitude: row.latitude,
    longitude: row.longitude,
    googleMapsPlaceUrl: row.googleMapsPlaceUrl,
    category: {
      slug: row.categorySlug,
      title: row.categoryTitle,
    },
    region: {
      slug: row.regionSlug,
      title: row.regionTitle,
    },
    tags: tagsByListingId.get(row.id) ?? [],
    destinations: destinationsByListingId.get(row.id) ?? [],
  }));
}

function normalizeRegionCatalogFilters(
  filters: RegionListingCatalogFilters,
  entries: Array<ListingSummary & { destinations: ListingDestinationSummary[] }>,
): RegionListingCatalogFilters {
  const nextFilters: RegionListingCatalogFilters = {};
  const categorySlug = typeof filters.categorySlug === "string" ? filters.categorySlug.trim() : undefined;
  const tagSlug = typeof filters.tagSlug === "string" ? filters.tagSlug.trim() : undefined;
  const destinationSlug = typeof filters.destinationSlug === "string" ? filters.destinationSlug.trim() : undefined;
  const busynessRating = filters.busynessRating;

  if (categorySlug && entries.some((entry) => entry.category.slug === categorySlug)) {
    nextFilters.categorySlug = categorySlug;
  }

  if (tagSlug && entries.some((entry) => entry.tags.some((tag) => tag.slug === tagSlug))) {
    nextFilters.tagSlug = tagSlug;
  }

  if (destinationSlug && entries.some((entry) => entry.destinations.some((destination) => destination.slug === destinationSlug))) {
    nextFilters.destinationSlug = destinationSlug;
  }

  if (
    Number.isInteger(busynessRating) &&
    busynessRating !== undefined &&
    busynessRating >= 1 &&
    busynessRating <= 5 &&
    entries.some((entry) => entry.busynessRating === busynessRating)
  ) {
    nextFilters.busynessRating = busynessRating;
  }

  return nextFilters;
}

function filterRegionCatalogEntries(
  entries: Array<ListingSummary & { destinations: ListingDestinationSummary[] }>,
  filters: RegionListingCatalogFilters,
) {
  const categorySlug = filters.categorySlug;
  const tagSlug = filters.tagSlug;
  const destinationSlug = filters.destinationSlug;
  const busynessRating = filters.busynessRating;

  return entries.filter((entry) => {
    if (categorySlug && entry.category.slug !== categorySlug) {
      return false;
    }

    if (tagSlug && !entry.tags.some((tag) => tag.slug === tagSlug)) {
      return false;
    }

    if (destinationSlug && !entry.destinations.some((destination) => destination.slug === destinationSlug)) {
      return false;
    }

    if (busynessRating && entry.busynessRating !== busynessRating) {
      return false;
    }

    return true;
  });
}

function buildRegionCatalogFacets(entries: Array<ListingSummary & { destinations: ListingDestinationSummary[] }>) {
  const categoryCounts = new Map<string, RegionListingCatalogCategoryFacet>();
  const tagCounts = new Map<string, RegionListingCatalogTagFacet>();
  const destinationCounts = new Map<string, RegionListingCatalogDestinationFacet>();
  const busynessCounts = new Map<number, RegionListingCatalogBusynessFacet>();

  for (const entry of entries) {
    const categoryBucket = categoryCounts.get(entry.category.slug);
    categoryCounts.set(entry.category.slug, {
      slug: entry.category.slug,
      title: entry.category.title,
      count: (categoryBucket?.count ?? 0) + 1,
    });

    for (const tag of entry.tags) {
      const tagBucket = tagCounts.get(tag.slug);
      tagCounts.set(tag.slug, {
        slug: tag.slug,
        name: tag.name,
        count: (tagBucket?.count ?? 0) + 1,
      });
    }

    for (const destination of entry.destinations) {
      const destinationBucket = destinationCounts.get(destination.slug);
      destinationCounts.set(destination.slug, {
        slug: destination.slug,
        title: destination.title,
        count: (destinationBucket?.count ?? 0) + 1,
      });
    }

    const busynessBucket = busynessCounts.get(entry.busynessRating);
    busynessCounts.set(entry.busynessRating, {
      rating: entry.busynessRating,
      count: (busynessBucket?.count ?? 0) + 1,
    });
  }

  return {
    categories: [...categoryCounts.values()].sort((left, right) => left.title.localeCompare(right.title)),
    tags: [...tagCounts.values()].sort((left, right) => left.name.localeCompare(right.name)),
    destinations: [...destinationCounts.values()].sort((left, right) => left.title.localeCompare(right.title)),
    busynessRatings: [...busynessCounts.values()].sort((left, right) => left.rating - right.rating),
  };
}

function ensureListingSlugAvailable(
  db: DbInstance["db"],
  regionId: string,
  slug: string,
  excludeListingId?: string,
) {
  const [existingListing] = db
    .select({
      id: listings.id,
    })
    .from(listings)
    .where(and(eq(listings.regionId, regionId), eq(listings.slug, slug)))
    .limit(1)
    .all();

  if (existingListing && existingListing.id !== excludeListingId) {
    throw new ServiceError("CONFLICT", `Listing slug "${slug}" already exists in this region.`);
  }
}

function normalizeOptionalCoordinates(latitude: number | null | undefined, longitude: number | null | undefined) {
  if ((latitude === undefined || latitude === null) && (longitude === undefined || longitude === null)) {
    return { latitude: null, longitude: null };
  }

  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    throw new ServiceError("INVALID_INPUT", "latitude and longitude must both be provided together.");
  }

  return {
    latitude: requireLatitude(latitude),
    longitude: requireLongitude(longitude),
  };
}

function normalizeOptionalBusynessRating(value: number | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  return requireBusynessRating(value);
}

function normalizeOptionalCategorySlug(db: DbInstance["db"], value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const categorySlug = requireNonEmptyString(value, "categorySlug");
  requireCategoryRecord(db, categorySlug);

  return categorySlug;
}

function validateListingImages(images: SetListingImagesInput[]) {
  ensureDistinctValues(
    images.map((image) => String(image.sortOrder)),
    "image sort order",
  );
  ensureDistinctValues(
    images.map((image) => requireNonEmptyString(image.imageUrl, "imageUrl")),
    "imageUrl",
  );

  for (const image of images) {
    if (!Number.isInteger(image.sortOrder) || image.sortOrder < 1) {
      throw new ServiceError("INVALID_INPUT", "Each image sortOrder must be a positive integer.");
    }
  }
}

function setListingStatus(
  locator: ListingLocator,
  status: "draft" | "published",
  context: WriteContext,
  dbInstance?: DbInstance,
) {
  const { db } = resolveDb(dbInstance);
  const listing = requireListingRecord(db, locator);

  assertMutableListing(listing);

  if (listing.status === status) {
    return toListingMutationResult(listing);
  }

  const writeContext = requireWriteContext(context);
  const now = new Date();

  db.update(listings)
    .set({
      status,
      updatedBy: writeContext.actorId,
      source: writeContext.source,
      updatedAt: now,
    })
    .where(eq(listings.id, listing.id))
    .run();

  return toListingMutationResult(requireListingRecordById(db, listing.id));
}

function toListingMutationResult(listing: ResolvedListingRecord): ListingMutationResult {
  return {
    id: listing.id,
    countrySlug: listing.countrySlug,
    regionSlug: listing.regionSlug,
    listingSlug: listing.listingSlug,
    title: listing.title,
    status: listing.status,
    deletedAt: listing.deletedAt,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    createdBy: listing.createdBy,
    updatedBy: listing.updatedBy,
    source: listing.source,
  };
}
