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

export type CreateListingDraftInput = {
  countrySlug: string;
  regionSlug: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  latitude: number;
  longitude: number;
  busynessRating: number;
  googleMapsPlaceUrl?: string | null;
  coverImage: string;
  categorySlug: string;
};

export type UpdateListingCopyAndMetadataInput = Partial<
  Pick<
    CreateListingDraftInput,
    "slug" | "title" | "shortDescription" | "description" | "coverImage" | "categorySlug" | "busynessRating"
  >
>;

export type SetListingLocationInput = {
  latitude: number;
  longitude: number;
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

  return attachTagsToListings(db, rows);
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

  return attachTagsToListings(db, rows);
}

export function getListingDetail(locator: ListingLocator, dbInstance?: DbInstance): ListingDetail | null {
  const { db } = resolveDb(dbInstance);
  const listing = requirePublicListingRecord(locator, dbInstance);

  if (!listing) {
    return null;
  }

  const tags = loadListingTags(db, [listing.id]).get(listing.id) ?? [];

  return {
    id: listing.id,
    slug: listing.listingSlug,
    title: listing.title,
    shortDescription: listing.shortDescription,
    description: listing.description,
    coverImage: listing.coverImage,
    busynessRating: listing.busynessRating,
    latitude: listing.latitude,
    longitude: listing.longitude,
    googleMapsPlaceUrl: listing.googleMapsPlaceUrl,
    category: {
      slug: listing.categorySlug,
      title: listing.categoryTitle,
    },
    region: {
      slug: listing.regionSlug,
      title: listing.regionTitle,
    },
    country: {
      slug: listing.countrySlug,
      title: listing.countryTitle,
    },
    tags,
    images: loadListingImages(db, listing.id),
    destinations: loadListingDestinations(db, listing.id),
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

  requireCategoryRecord(db, input.categorySlug);
  requireNonEmptyString(input.title, "title");
  requireNonEmptyString(input.shortDescription, "shortDescription");
  requireNonEmptyString(input.description, "description");
  requireNonEmptyString(input.coverImage, "coverImage");
  requireBusynessRating(input.busynessRating);
  requireLatitude(input.latitude);
  requireLongitude(input.longitude);
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
        latitude: input.latitude,
        longitude: input.longitude,
        busynessRating: input.busynessRating,
        googleMapsPlaceUrl: requireOptionalString(input.googleMapsPlaceUrl, "googleMapsPlaceUrl"),
        coverImage: input.coverImage.trim(),
        categorySlug: input.categorySlug.trim(),
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
    patch.coverImage === undefined ? listing.coverImage : requireNonEmptyString(patch.coverImage, "coverImage");
  const nextCategorySlug =
    patch.categorySlug === undefined ? listing.categorySlug : requireNonEmptyString(patch.categorySlug, "categorySlug");
  const nextBusynessRating =
    patch.busynessRating === undefined ? listing.busynessRating : requireBusynessRating(patch.busynessRating);

  requireCategoryRecord(db, nextCategorySlug);
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

  assertMutableListing(listing);

  db.update(listings)
    .set({
      latitude: requireLatitude(input.latitude),
      longitude: requireLongitude(input.longitude),
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

  return listing;
}

function attachTagsToListings(
  db: DbInstance["db"],
  rows: Array<{
    id: string;
    slug: string;
    title: string;
    shortDescription: string;
    coverImage: string;
    busynessRating: number;
    latitude: number;
    longitude: number;
    googleMapsPlaceUrl: string | null;
    categorySlug: string;
    categoryTitle: string;
    regionSlug: string;
    regionTitle: string;
  }>,
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
