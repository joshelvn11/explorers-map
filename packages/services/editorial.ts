import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import {
  categories,
  destinationRegions,
  destinations,
  listingDestinations,
  listings,
  regions,
  type DbInstance,
} from "@explorers-map/db";

import {
  assignListingDestinations,
  createListingDraft,
  publishListing,
  restoreListing,
  setListingImages,
  setListingLocation,
  trashListing,
  updateListingCopyAndMetadata,
} from "./listings.ts";
import { ServiceError } from "./errors.ts";
import {
  ensureDistinctValues,
  loadDestinationRegions,
  loadListingDestinations,
  loadListingImages,
  requireBusynessRating,
  requireCategoryRecord,
  requireCountryRecord,
  requireDestinationRecord,
  requireLatitude,
  requireListingRecord,
  requireLongitude,
  requireNonEmptyString,
  requireOptionalString,
  requireRegionRecord,
  requireWriteContext,
  resolveDb,
  resolveListingRecordById,
  type DestinationLocator,
  type ListingLocator,
  type RegionLocator,
  type ResolvedDestinationRecord,
  type ResolvedListingRecord,
  type ResolvedRegionRecord,
  type WriteContext,
} from "./shared.ts";

export type EvidenceItem = {
  label: string;
  note: string;
  url?: string;
};

export type EvidenceInput = EvidenceItem[];

export type CategoryRecord = {
  slug: string;
  title: string;
};

export type RegionRecord = {
  id: string;
  countrySlug: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};

export type DestinationRegionRecord = {
  slug: string;
  title: string;
};

export type DestinationRecord = {
  id: string;
  countrySlug: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  regions: DestinationRegionRecord[];
};

export type ListingRecord = {
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

export type MatchCandidate = {
  id: string;
  type: "region" | "destination" | "listing";
  countrySlug: string;
  slug: string;
  title: string;
  confidence: number;
  reasons: string[];
};

export type FindResult = {
  status: "exact_match" | "candidate_matches" | "not_found";
  confidence: number;
  reasons: string[];
  candidates: MatchCandidate[];
};

export type EnsureResult<TRecord> = {
  status: "matched" | "created" | "candidate_matches" | "insufficient_evidence";
  confidence: number;
  reasons: string[];
  record?: TRecord;
  candidates?: MatchCandidate[];
  evidence?: EvidenceInput;
  warnings?: string[];
};

export type MutationResult<TRecord> = {
  status: "created" | "updated" | "unchanged";
  record: TRecord;
  evidence: EvidenceInput;
  warnings: string[];
};

export type RegionFindInput = {
  countrySlug: string;
  query: string;
  limit?: number;
};

export type DestinationFindInput = {
  countrySlug: string;
  query: string;
  regionSlug?: string;
  limit?: number;
};

export type ListingFindInput = {
  countrySlug: string;
  query: string;
  regionSlug?: string;
  destinationSlug?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
};

export type CreateRegionInput = {
  countrySlug: string;
  title: string;
  description: string;
  coverImage: string;
  slug?: string;
  evidence?: EvidenceInput;
};

export type CreateDestinationInput = {
  countrySlug: string;
  title: string;
  description: string;
  coverImage: string;
  slug?: string;
  regionSlugs?: string[];
  evidence?: EvidenceInput;
};

export type AssignDestinationRegionsInput = {
  countrySlug: string;
  destinationSlug: string;
  regionSlugs: string[];
  evidence?: EvidenceInput;
};

export type ListListingsInput =
  | {
      countrySlug: string;
      regionSlug: string;
      destinationSlug?: never;
      includeDrafts?: boolean;
      includeTrashed?: boolean;
    }
  | {
      countrySlug: string;
      regionSlug?: never;
      destinationSlug: string;
      includeDrafts?: boolean;
      includeTrashed?: boolean;
    };

export type CreateListingDraftEditorInput = {
  countrySlug: string;
  regionSlug: string;
  title: string;
  shortDescription: string;
  description: string;
  latitude: number;
  longitude: number;
  busynessRating: number;
  googleMapsPlaceUrl?: string | null;
  coverImage: string;
  categorySlug: string;
  slug?: string;
  destinationSlugs?: string[];
  images?: Array<{
    imageUrl: string;
    sortOrder: number;
  }>;
  evidence?: EvidenceInput;
};

const EXACT_MATCH_THRESHOLD = 0.96;
const CANDIDATE_THRESHOLD = 0.62;
const AMBIGUITY_DELTA = 0.05;

export function listCategories(dbInstance?: DbInstance): CategoryRecord[] {
  const { db } = resolveDb(dbInstance);

  return db
    .select({
      slug: categories.slug,
      title: categories.title,
    })
    .from(categories)
    .orderBy(asc(categories.title))
    .all();
}

export function listRegionsForEditor(countrySlug: string, dbInstance?: DbInstance): RegionRecord[] {
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, countrySlug);

  return db
    .select({
      id: regions.id,
      slug: regions.slug,
      title: regions.title,
      description: regions.description,
      coverImage: regions.coverImage,
    })
    .from(regions)
    .where(eq(regions.countryId, country.id))
    .orderBy(asc(regions.title))
    .all()
    .map((region) => ({
      ...region,
      countrySlug: country.slug,
    }));
}

export function getRegionForEditor(locator: RegionLocator, dbInstance?: DbInstance): RegionRecord {
  const { db } = resolveDb(dbInstance);
  return mapRegionRecord(requireRegionRecord(db, locator));
}

export function createRegion(input: CreateRegionInput, dbInstance?: DbInstance): MutationResult<RegionRecord> {
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);
  const title = requireNonEmptyString(input.title, "title");
  const evidence = requireEvidence(input.evidence, "Region creation requires evidence.");
  const now = new Date();
  const slug = deriveSlug(input.slug, title, "region");

  requireNonEmptyString(input.description, "description");
  requireNonEmptyString(input.coverImage, "coverImage");
  ensureRegionSlugAvailable(db, country.id, slug);

  db.insert(regions)
    .values({
      id: randomUUID(),
      countryId: country.id,
      slug,
      title,
      description: input.description.trim(),
      coverImage: input.coverImage.trim(),
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return {
    status: "created",
    record: getRegionForEditor({ countrySlug: country.slug, regionSlug: slug }, dbInstance),
    evidence,
    warnings: [],
  };
}

export function ensureRegion(input: CreateRegionInput, dbInstance?: DbInstance): EnsureResult<RegionRecord> {
  const evidence = normalizeEvidence(input.evidence);
  const match = findRegion(
    {
      countrySlug: input.countrySlug,
      query: input.slug?.trim() || input.title,
      limit: 5,
    },
    dbInstance,
  );

  if (match.status === "exact_match") {
    const [candidate] = match.candidates;

    return {
      status: "matched",
      confidence: match.confidence,
      reasons: match.reasons,
      record: getRegionForEditor({ countrySlug: input.countrySlug, regionSlug: candidate.slug }, dbInstance),
      candidates: match.candidates,
      evidence: evidence ?? undefined,
      warnings: [],
    };
  }

  if (match.status === "candidate_matches") {
    return {
      status: "candidate_matches",
      confidence: match.confidence,
      reasons: match.reasons,
      candidates: match.candidates,
      evidence: evidence ?? undefined,
      warnings: [],
    };
  }

  if (!evidence) {
    return {
      status: "insufficient_evidence",
      confidence: 0,
      reasons: ["No safe existing region match was found.", "Region creation requires non-empty evidence."],
      evidence: undefined,
      warnings: [],
    };
  }

  const created = createRegion(input, dbInstance);

  return {
    status: "created",
    confidence: 1,
    reasons: ["No safe existing region match was found.", "Created a new region from the provided evidence."],
    record: created.record,
    evidence: created.evidence,
    warnings: created.warnings,
  };
}

export function findRegion(input: RegionFindInput, dbInstance?: DbInstance): FindResult {
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);
  const query = requireNonEmptyString(input.query, "query");
  const limit = normalizeLimit(input.limit);
  const regionRows = db
    .select({
      id: regions.id,
      slug: regions.slug,
      title: regions.title,
    })
    .from(regions)
    .where(eq(regions.countryId, country.id))
    .orderBy(asc(regions.title))
    .all();

  return buildFindResult(
    regionRows.map((region) => {
      const scored = scoreNameCandidate(query, region.slug, region.title);
      return {
        id: region.id,
        type: "region" as const,
        countrySlug: country.slug,
        slug: region.slug,
        title: region.title,
        confidence: scored.confidence,
        reasons: scored.reasons,
      };
    }),
    limit,
  );
}

export function listDestinationsForEditor(
  input: { countrySlug: string; regionSlug?: string },
  dbInstance?: DbInstance,
): DestinationRecord[] {
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);

  if (input.regionSlug) {
    const region = requireRegionRecord(db, { countrySlug: country.slug, regionSlug: input.regionSlug });
    const destinationRows = db
      .select({
        id: destinations.id,
        slug: destinations.slug,
        title: destinations.title,
        description: destinations.description,
        coverImage: destinations.coverImage,
      })
      .from(destinationRegions)
      .innerJoin(destinations, eq(destinationRegions.destinationId, destinations.id))
      .where(eq(destinationRegions.regionId, region.id))
      .orderBy(asc(destinations.title))
      .all();

    return destinationRows.map((row) => ({
      id: row.id,
      countrySlug: country.slug,
      slug: row.slug,
      title: row.title,
      description: row.description,
      coverImage: row.coverImage,
      regions: loadDestinationRegions(db, row.id),
    }));
  }

  return db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      title: destinations.title,
      description: destinations.description,
      coverImage: destinations.coverImage,
    })
    .from(destinations)
    .where(eq(destinations.countryId, country.id))
    .orderBy(asc(destinations.title))
    .all()
    .map((destination) => ({
      id: destination.id,
      countrySlug: country.slug,
      slug: destination.slug,
      title: destination.title,
      description: destination.description,
      coverImage: destination.coverImage,
      regions: loadDestinationRegions(db, destination.id),
    }));
}

export function getDestinationForEditor(locator: DestinationLocator, dbInstance?: DbInstance): DestinationRecord {
  const { db } = resolveDb(dbInstance);
  return mapDestinationRecord(requireDestinationRecord(db, locator), db);
}

export function createDestination(
  input: CreateDestinationInput,
  dbInstance?: DbInstance,
): MutationResult<DestinationRecord> {
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);
  const title = requireNonEmptyString(input.title, "title");
  const description = requireNonEmptyString(input.description, "description");
  const coverImage = requireNonEmptyString(input.coverImage, "coverImage");
  const evidence = requireEvidence(input.evidence, "Destination creation requires evidence.");
  const slug = deriveSlug(input.slug, title, "destination");
  const regionSlugs = normalizeDistinctSlugs(input.regionSlugs ?? [], "regionSlugs");
  const now = new Date();

  ensureDestinationSlugAvailable(db, country.id, slug);

  db.transaction((tx) => {
    const destinationId = randomUUID();

    tx.insert(destinations)
      .values({
        id: destinationId,
        countryId: country.id,
        slug,
        title,
        description,
        coverImage,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (regionSlugs.length > 0) {
      const regionRecords = regionSlugs.map((regionSlug) =>
        requireRegionRecord(tx, { countrySlug: country.slug, regionSlug }),
      );

      tx.insert(destinationRegions)
        .values(
          regionRecords.map((region) => ({
            destinationId,
            regionId: region.id,
          })),
        )
        .run();
    }
  });

  return {
    status: "created",
    record: getDestinationForEditor({ countrySlug: country.slug, destinationSlug: slug }, dbInstance),
    evidence,
    warnings: [],
  };
}

export function ensureDestination(input: CreateDestinationInput, dbInstance?: DbInstance): EnsureResult<DestinationRecord> {
  const evidence = normalizeEvidence(input.evidence);
  const match = findDestination(
    {
      countrySlug: input.countrySlug,
      query: input.slug?.trim() || input.title,
      regionSlug: input.regionSlugs?.length === 1 ? input.regionSlugs[0] : undefined,
      limit: 5,
    },
    dbInstance,
  );

  if (match.status === "exact_match") {
    const [candidate] = match.candidates;

    return {
      status: "matched",
      confidence: match.confidence,
      reasons: match.reasons,
      record: getDestinationForEditor(
        { countrySlug: input.countrySlug, destinationSlug: candidate.slug },
        dbInstance,
      ),
      candidates: match.candidates,
      evidence: evidence ?? undefined,
      warnings: [],
    };
  }

  if (match.status === "candidate_matches") {
    return {
      status: "candidate_matches",
      confidence: match.confidence,
      reasons: match.reasons,
      candidates: match.candidates,
      evidence: evidence ?? undefined,
      warnings: [],
    };
  }

  if (!evidence) {
    return {
      status: "insufficient_evidence",
      confidence: 0,
      reasons: ["No safe existing destination match was found.", "Destination creation requires non-empty evidence."],
      warnings: [],
    };
  }

  const created = createDestination(input, dbInstance);

  return {
    status: "created",
    confidence: 1,
    reasons: ["No safe existing destination match was found.", "Created a new destination from the provided evidence."],
    record: created.record,
    evidence: created.evidence,
    warnings: created.warnings,
  };
}

export function assignDestinationRegions(
  input: AssignDestinationRegionsInput,
  dbInstance?: DbInstance,
): MutationResult<DestinationRecord> {
  const { db } = resolveDb(dbInstance);
  const destination = requireDestinationRecord(db, input);
  const evidence = normalizeEvidence(input.evidence) ?? [];
  const regionSlugs = normalizeDistinctSlugs(input.regionSlugs, "regionSlugs");
  const regionRecords = regionSlugs.map((regionSlug) =>
    requireRegionRecord(db, { countrySlug: destination.countrySlug, regionSlug }),
  );
  const now = new Date();

  db.transaction((tx) => {
    tx.delete(destinationRegions).where(eq(destinationRegions.destinationId, destination.id)).run();

    if (regionRecords.length > 0) {
      tx.insert(destinationRegions)
        .values(
          regionRecords.map((region) => ({
            destinationId: destination.id,
            regionId: region.id,
          })),
        )
        .run();
    }

    tx.update(destinations)
      .set({
        updatedAt: now,
      })
      .where(eq(destinations.id, destination.id))
      .run();
  });

  return {
    status: "updated",
    record: getDestinationForEditor(
      { countrySlug: destination.countrySlug, destinationSlug: destination.slug },
      dbInstance,
    ),
    evidence,
    warnings: [],
  };
}

export function findDestination(input: DestinationFindInput, dbInstance?: DbInstance): FindResult {
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);
  const query = requireNonEmptyString(input.query, "query");
  const limit = normalizeLimit(input.limit);
  const scopedRegionId = input.regionSlug
    ? requireRegionRecord(db, { countrySlug: country.slug, regionSlug: input.regionSlug }).id
    : null;
  const destinationRows = db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      title: destinations.title,
    })
    .from(destinations)
    .where(eq(destinations.countryId, country.id))
    .orderBy(asc(destinations.title))
    .all();

  const destinationRegionMap = new Map<string, Set<string>>();

  if (destinationRows.length > 0) {
    const rows = db
      .select({
        destinationId: destinationRegions.destinationId,
        regionId: destinationRegions.regionId,
      })
      .from(destinationRegions)
      .where(inArray(destinationRegions.destinationId, destinationRows.map((row) => row.id)))
      .all();

    for (const row of rows) {
      const regionIds = destinationRegionMap.get(row.destinationId) ?? new Set<string>();
      regionIds.add(row.regionId);
      destinationRegionMap.set(row.destinationId, regionIds);
    }
  }

  return buildFindResult(
    destinationRows.map((destination) => {
      const scored = scoreNameCandidate(query, destination.slug, destination.title);
      const reasons = [...scored.reasons];
      let confidence = scored.confidence;

      if (scopedRegionId && destinationRegionMap.get(destination.id)?.has(scopedRegionId)) {
        confidence = clampConfidence(confidence + 0.08);
        reasons.push("Already linked to the requested region.");
      }

      return {
        id: destination.id,
        type: "destination" as const,
        countrySlug: country.slug,
        slug: destination.slug,
        title: destination.title,
        confidence,
        reasons,
      };
    }),
    limit,
  );
}

export function listListingsForEditor(input: ListListingsInput, dbInstance?: DbInstance): ListingRecord[] {
  const { db } = resolveDb(dbInstance);
  const scope = resolveListingScope(input, dbInstance);
  const rows =
    scope.type === "region"
      ? db
          .select({
            id: listings.id,
          })
          .from(listings)
          .where(buildEditorListingVisibilityCondition(eq(listings.regionId, scope.regionId), input))
          .orderBy(asc(listings.title))
          .all()
      : db
          .select({
            id: listings.id,
          })
          .from(listingDestinations)
          .innerJoin(listings, eq(listingDestinations.listingId, listings.id))
          .where(
            buildEditorListingVisibilityCondition(
              eq(listingDestinations.destinationId, scope.destinationId),
              input,
            ),
          )
          .orderBy(asc(listings.title))
          .all();

  return rows
    .map((row) => resolveListingRecordById(db, row.id))
    .filter((listing): listing is ResolvedListingRecord => Boolean(listing))
    .map((listing) => mapListingRecord(listing, db));
}

export function getListingForEditor(locator: ListingLocator, dbInstance?: DbInstance): ListingRecord {
  const { db } = resolveDb(dbInstance);
  return mapListingRecord(requireListingRecord(db, locator), db);
}

export function findListing(input: ListingFindInput, dbInstance?: DbInstance): FindResult {
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);
  const query = requireNonEmptyString(input.query, "query");
  const limit = normalizeLimit(input.limit);

  if (input.regionSlug && input.destinationSlug) {
    throw new ServiceError("INVALID_INPUT", "Specify at most one of regionSlug or destinationSlug for findListing.");
  }

  const region = input.regionSlug
    ? requireRegionRecord(db, { countrySlug: country.slug, regionSlug: input.regionSlug })
    : null;
  const destination = input.destinationSlug
    ? requireDestinationRecord(db, { countrySlug: country.slug, destinationSlug: input.destinationSlug })
    : null;
  const listingRows = db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      regionSlug: regions.slug,
      regionTitle: regions.title,
      latitude: listings.latitude,
      longitude: listings.longitude,
    })
    .from(listings)
    .innerJoin(regions, eq(listings.regionId, regions.id))
    .where(and(eq(regions.countryId, country.id), isNull(listings.deletedAt)))
    .orderBy(asc(listings.title))
    .all();

  const listingDestinationMap = new Map<string, Set<string>>();

  if (listingRows.length > 0) {
    const rows = db
      .select({
        listingId: listingDestinations.listingId,
        destinationId: listingDestinations.destinationId,
      })
      .from(listingDestinations)
      .where(inArray(listingDestinations.listingId, listingRows.map((row) => row.id)))
      .all();

    for (const row of rows) {
      const destinationIds = listingDestinationMap.get(row.listingId) ?? new Set<string>();
      destinationIds.add(row.destinationId);
      listingDestinationMap.set(row.listingId, destinationIds);
    }
  }

  return buildFindResult(
    listingRows.map((listing) => {
      const scored = scoreNameCandidate(query, listing.slug, listing.title);
      const reasons = [...scored.reasons];
      let confidence = scored.confidence;

      if (region && listing.regionSlug === region.slug) {
        confidence = clampConfidence(confidence + 0.08);
        reasons.push("Already exists in the requested region.");
      }

      if (destination && listingDestinationMap.get(listing.id)?.has(destination.id)) {
        confidence = clampConfidence(confidence + 0.08);
        reasons.push("Already linked to the requested destination.");
      }

      if (input.latitude !== undefined && input.longitude !== undefined) {
        const proximity = scoreCoordinateProximity(
          input.latitude,
          input.longitude,
          listing.latitude,
          listing.longitude,
        );

        confidence = clampConfidence(confidence + proximity.bonus);
        reasons.push(...proximity.reasons);
      }

      return {
        id: listing.id,
        type: "listing" as const,
        countrySlug: country.slug,
        slug: listing.slug,
        title: listing.title,
        confidence,
        reasons,
      };
    }),
    limit,
  );
}

export function createListingDraftForEditor(
  input: CreateListingDraftEditorInput,
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const { db } = resolveDb(dbInstance);
  const evidence = requireEvidence(input.evidence, "Listing draft creation requires evidence.");
  const title = requireNonEmptyString(input.title, "title");
  const slug = deriveSlug(input.slug, title, "listing");
  const region = requireRegionRecord(db, { countrySlug: input.countrySlug, regionSlug: input.regionSlug });
  const writeContext = requireWriteContext(context);
  const destinationSlugs = normalizeDistinctSlugs(input.destinationSlugs ?? [], "destinationSlugs");
  const images = input.images ?? [];

  requireNonEmptyString(input.shortDescription, "shortDescription");
  requireNonEmptyString(input.description, "description");
  requireLatitude(input.latitude);
  requireLongitude(input.longitude);
  requireBusynessRating(input.busynessRating);
  requireCategoryRecord(db, input.categorySlug);
  requireNonEmptyString(input.coverImage, "coverImage");
  requireOptionalString(input.googleMapsPlaceUrl, "googleMapsPlaceUrl");
  destinationSlugs.forEach((destinationSlug) =>
    requireDestinationRecord(db, { countrySlug: input.countrySlug, destinationSlug }),
  );
  validateListingImageInput(images);

  createListingDraft(
    {
      countrySlug: input.countrySlug,
      regionSlug: region.slug,
      slug,
      title,
      shortDescription: input.shortDescription,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      busynessRating: input.busynessRating,
      googleMapsPlaceUrl: input.googleMapsPlaceUrl,
      coverImage: input.coverImage,
      categorySlug: input.categorySlug,
    },
    writeContext,
    dbInstance,
  );

  if (destinationSlugs.length > 0) {
    assignListingDestinations(
      {
        countrySlug: input.countrySlug,
        regionSlug: region.slug,
        listingSlug: slug,
      },
      destinationSlugs.map((destinationSlug) => ({ countrySlug: input.countrySlug, destinationSlug })),
      writeContext,
      dbInstance,
    );
  }

  if (images.length > 0) {
    setListingImages(
      {
        countrySlug: input.countrySlug,
        regionSlug: region.slug,
        listingSlug: slug,
      },
      images,
      writeContext,
      dbInstance,
    );
  }

  return {
    status: "created",
    record: getListingForEditor(
      {
        countrySlug: input.countrySlug,
        regionSlug: region.slug,
        listingSlug: slug,
      },
      dbInstance,
    ),
    evidence,
    warnings: [],
  };
}

export function ensureListing(
  input: CreateListingDraftEditorInput,
  context: WriteContext,
  dbInstance?: DbInstance,
): EnsureResult<ListingRecord> {
  const evidence = normalizeEvidence(input.evidence);
  const match = findListing(
    {
      countrySlug: input.countrySlug,
      regionSlug: input.regionSlug,
      query: input.slug?.trim() || input.title,
      latitude: input.latitude,
      longitude: input.longitude,
      limit: 5,
    },
    dbInstance,
  );

  if (match.status === "exact_match") {
    const [candidate] = match.candidates;

    return {
      status: "matched",
      confidence: match.confidence,
      reasons: match.reasons,
      record: getListingForEditor(
        {
          countrySlug: input.countrySlug,
          regionSlug: input.regionSlug,
          listingSlug: candidate.slug,
        },
        dbInstance,
      ),
      candidates: match.candidates,
      evidence: evidence ?? undefined,
      warnings: [],
    };
  }

  if (match.status === "candidate_matches") {
    return {
      status: "candidate_matches",
      confidence: match.confidence,
      reasons: match.reasons,
      candidates: match.candidates,
      evidence: evidence ?? undefined,
      warnings: [],
    };
  }

  if (!evidence) {
    return {
      status: "insufficient_evidence",
      confidence: 0,
      reasons: ["No safe existing listing match was found.", "Listing creation requires non-empty evidence."],
      warnings: [],
    };
  }

  const created = createListingDraftForEditor(input, context, dbInstance);

  return {
    status: "created",
    confidence: 1,
    reasons: ["No safe existing listing match was found.", "Created a new listing draft from the provided evidence."],
    record: created.record,
    evidence: created.evidence,
    warnings: created.warnings,
  };
}

export function updateListingCopyForEditor(
  locator: ListingLocator,
  patch: {
    title?: string;
    shortDescription?: string;
    description?: string;
    evidence?: EvidenceInput;
  },
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const { evidence, ...copyPatch } = patch;
  const result = updateListingCopyAndMetadata(locator, copyPatch, context, dbInstance);

  return {
    status: "updated",
    record: getListingForEditor(
      { countrySlug: result.countrySlug, regionSlug: result.regionSlug, listingSlug: result.listingSlug },
      dbInstance,
    ),
    evidence: normalizeEvidence(evidence) ?? [],
    warnings: [],
  };
}

export function updateListingMetadataForEditor(
  locator: ListingLocator,
  patch: {
    slug?: string;
    coverImage?: string;
    categorySlug?: string;
    busynessRating?: number;
    evidence?: EvidenceInput;
  },
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const { evidence, ...metadataPatch } = patch;
  const result = updateListingCopyAndMetadata(locator, metadataPatch, context, dbInstance);

  return {
    status: "updated",
    record: getListingForEditor(
      { countrySlug: result.countrySlug, regionSlug: result.regionSlug, listingSlug: result.listingSlug },
      dbInstance,
    ),
    evidence: normalizeEvidence(evidence) ?? [],
    warnings: [],
  };
}

export function setListingLocationForEditor(
  locator: ListingLocator,
  input: {
    latitude: number;
    longitude: number;
    googleMapsPlaceUrl?: string | null;
    evidence?: EvidenceInput;
  },
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const result = setListingLocation(locator, input, context, dbInstance);

  return {
    status: "updated",
    record: getListingForEditor(
      { countrySlug: result.countrySlug, regionSlug: result.regionSlug, listingSlug: result.listingSlug },
      dbInstance,
    ),
    evidence: normalizeEvidence(input.evidence) ?? [],
    warnings: [],
  };
}

export function assignListingDestinationsForEditor(
  locator: ListingLocator,
  input: {
    destinationSlugs: string[];
    evidence?: EvidenceInput;
  },
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const destinationSlugs = normalizeDistinctSlugs(input.destinationSlugs, "destinationSlugs");
  const result = assignListingDestinations(
    locator,
    destinationSlugs.map((destinationSlug) => ({ countrySlug: locator.countrySlug, destinationSlug })),
    context,
    dbInstance,
  );

  return {
    status: "updated",
    record: getListingForEditor(
      {
        countrySlug: result.listing.countrySlug,
        regionSlug: result.listing.regionSlug,
        listingSlug: result.listing.listingSlug,
      },
      dbInstance,
    ),
    evidence: normalizeEvidence(input.evidence) ?? [],
    warnings: [],
  };
}

export function attachListingImagesForEditor(
  locator: ListingLocator,
  input: {
    images: Array<{
      imageUrl: string;
      sortOrder: number;
    }>;
    evidence?: EvidenceInput;
  },
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const result = setListingImages(locator, input.images, context, dbInstance);

  return {
    status: "updated",
    record: getListingForEditor(
      {
        countrySlug: result.listing.countrySlug,
        regionSlug: result.listing.regionSlug,
        listingSlug: result.listing.listingSlug,
      },
      dbInstance,
    ),
    evidence: normalizeEvidence(input.evidence) ?? [],
    warnings: [],
  };
}

export function publishListingForEditor(
  locator: ListingLocator,
  evidence: EvidenceInput | undefined,
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const result = publishListing(locator, context, dbInstance);

  return {
    status: "updated",
    record: getListingForEditor(
      { countrySlug: result.countrySlug, regionSlug: result.regionSlug, listingSlug: result.listingSlug },
      dbInstance,
    ),
    evidence: normalizeEvidence(evidence) ?? [],
    warnings: [],
  };
}

export function trashListingForEditor(
  locator: ListingLocator,
  evidence: EvidenceInput | undefined,
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const result = trashListing(locator, context, dbInstance);

  return {
    status: "updated",
    record: getListingForEditor(
      { countrySlug: result.countrySlug, regionSlug: result.regionSlug, listingSlug: result.listingSlug },
      dbInstance,
    ),
    evidence: normalizeEvidence(evidence) ?? [],
    warnings: [],
  };
}

export function restoreListingForEditor(
  locator: ListingLocator,
  evidence: EvidenceInput | undefined,
  context: WriteContext,
  dbInstance?: DbInstance,
): MutationResult<ListingRecord> {
  const result = restoreListing(locator, context, dbInstance);

  return {
    status: "updated",
    record: getListingForEditor(
      { countrySlug: result.countrySlug, regionSlug: result.regionSlug, listingSlug: result.listingSlug },
      dbInstance,
    ),
    evidence: normalizeEvidence(evidence) ?? [],
    warnings: [],
  };
}

export function normalizeEvidence(evidence: EvidenceInput | undefined): EvidenceInput | null {
  if (evidence === undefined) {
    return null;
  }

  if (!Array.isArray(evidence) || evidence.length === 0) {
    throw new ServiceError("INSUFFICIENT_EVIDENCE", "evidence must contain at least one item.");
  }

  return evidence.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new ServiceError("INVALID_INPUT", `evidence[${index}] must be an object.`);
    }

    const label = requireNonEmptyString(item.label, `evidence[${index}].label`);
    const note = requireNonEmptyString(item.note, `evidence[${index}].note`);
    const url = item.url === undefined ? undefined : requireNonEmptyString(item.url, `evidence[${index}].url`);

    if (url) {
      try {
        new URL(url);
      } catch {
        throw new ServiceError("INVALID_INPUT", `evidence[${index}].url must be a valid URL.`);
      }
    }

    return url ? { label, note, url } : { label, note };
  });
}

export function requireEvidence(evidence: EvidenceInput | undefined, message: string): EvidenceInput {
  const normalized = normalizeEvidence(evidence);

  if (!normalized) {
    throw new ServiceError("INSUFFICIENT_EVIDENCE", message);
  }

  return normalized;
}

export function deriveSlug(explicitSlug: string | undefined, title: string, label: string): string {
  if (explicitSlug !== undefined) {
    return normalizeSlug(explicitSlug, label);
  }

  return normalizeSlug(title, label);
}

function normalizeSlug(input: string, label: string): string {
  const value = requireNonEmptyString(input, label);
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new ServiceError("INVALID_INPUT", `${label} must contain at least one alphanumeric character.`);
  }

  return slug;
}

function mapRegionRecord(region: ResolvedRegionRecord): RegionRecord {
  return {
    id: region.id,
    countrySlug: region.countrySlug,
    slug: region.slug,
    title: region.title,
    description: region.description,
    coverImage: region.coverImage,
  };
}

function mapDestinationRecord(destination: ResolvedDestinationRecord, db: DbInstance["db"]): DestinationRecord {
  return {
    id: destination.id,
    countrySlug: destination.countrySlug,
    slug: destination.slug,
    title: destination.title,
    description: destination.description,
    coverImage: destination.coverImage,
    regions: loadDestinationRegions(db, destination.id),
  };
}

function mapListingRecord(listing: ResolvedListingRecord, db: DbInstance["db"]): ListingRecord {
  return {
    id: listing.id,
    countrySlug: listing.countrySlug,
    regionSlug: listing.regionSlug,
    slug: listing.listingSlug,
    title: listing.title,
    status: listing.status,
    deletedAt: listing.deletedAt?.toISOString() ?? null,
    shortDescription: listing.shortDescription,
    description: listing.description,
    latitude: listing.latitude,
    longitude: listing.longitude,
    busynessRating: listing.busynessRating,
    googleMapsPlaceUrl: listing.googleMapsPlaceUrl,
    coverImage: listing.coverImage,
    category: {
      slug: listing.categorySlug,
      title: listing.categoryTitle,
    },
    destinations: loadListingDestinations(db, listing.id),
    images: loadListingImages(db, listing.id),
    source: listing.source,
    createdBy: listing.createdBy,
    updatedBy: listing.updatedBy,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  };
}

function ensureRegionSlugAvailable(db: DbInstance["db"], countryId: string, slug: string) {
  const existing = db
    .select({ id: regions.id })
    .from(regions)
    .where(and(eq(regions.countryId, countryId), eq(regions.slug, slug)))
    .limit(1)
    .get();

  if (existing) {
    throw new ServiceError("CONFLICT", `Region slug "${slug}" already exists in this country.`);
  }
}

function ensureDestinationSlugAvailable(db: DbInstance["db"], countryId: string, slug: string) {
  const existing = db
    .select({ id: destinations.id })
    .from(destinations)
    .where(and(eq(destinations.countryId, countryId), eq(destinations.slug, slug)))
    .limit(1)
    .get();

  if (existing) {
    throw new ServiceError("CONFLICT", `Destination slug "${slug}" already exists in this country.`);
  }
}

function resolveListingScope(input: ListListingsInput, dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);

  if ("regionSlug" in input && input.regionSlug) {
    const region = requireRegionRecord(db, { countrySlug: input.countrySlug, regionSlug: input.regionSlug });
    return {
      type: "region" as const,
      regionId: region.id,
    };
  }

  if ("destinationSlug" in input && input.destinationSlug) {
    const destination = requireDestinationRecord(db, {
      countrySlug: input.countrySlug,
      destinationSlug: input.destinationSlug,
    });

    return {
      type: "destination" as const,
      destinationId: destination.id,
    };
  }

  throw new ServiceError("INVALID_INPUT", "Provide exactly one of regionSlug or destinationSlug.");
}

function buildEditorListingVisibilityCondition(
  scopeCondition: ReturnType<typeof eq>,
  input: { includeDrafts?: boolean; includeTrashed?: boolean },
) {
  const conditions = [scopeCondition];

  if (!input.includeDrafts) {
    conditions.push(eq(listings.status, "published"));
  }

  if (!input.includeTrashed) {
    conditions.push(isNull(listings.deletedAt));
  }

  return and(...conditions);
}

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined) {
    return 5;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new ServiceError("INVALID_INPUT", "limit must be an integer between 1 and 20.");
  }

  return limit;
}

function buildFindResult(candidates: MatchCandidate[], limit: number): FindResult {
  const filteredCandidates = candidates
    .filter((candidate) => candidate.confidence >= CANDIDATE_THRESHOLD)
    .sort((left, right) => right.confidence - left.confidence || left.title.localeCompare(right.title))
    .slice(0, limit);
  const [topCandidate, secondCandidate] = filteredCandidates;

  if (!topCandidate) {
    return {
      status: "not_found",
      confidence: 0,
      reasons: ["No sufficiently confident existing match was found."],
      candidates: [],
    };
  }

  if (
    topCandidate.confidence >= EXACT_MATCH_THRESHOLD &&
    (!secondCandidate || topCandidate.confidence - secondCandidate.confidence >= AMBIGUITY_DELTA)
  ) {
    return {
      status: "exact_match",
      confidence: topCandidate.confidence,
      reasons: topCandidate.reasons,
      candidates: [topCandidate],
    };
  }

  return {
    status: "candidate_matches",
    confidence: topCandidate.confidence,
    reasons: ["Multiple plausible matches were found; choose one explicitly before writing."],
    candidates: filteredCandidates,
  };
}

function scoreNameCandidate(query: string, slug: string, title: string) {
  const normalizedQuery = normalizeMatchString(query);
  const normalizedSlug = normalizeMatchString(slug.replace(/-/g, " "));
  const normalizedTitle = normalizeMatchString(title);
  const derivedQuerySlug = normalizeSlug(query, "query").replace(/-/g, " ");
  const queryTokens = tokenize(normalizedQuery);
  const slugTokens = tokenize(normalizedSlug);
  const titleTokens = tokenize(normalizedTitle);
  const reasons: string[] = [];
  let confidence = 0;

  if (normalizedQuery === normalizedTitle) {
    confidence = Math.max(confidence, 0.99);
    reasons.push("Exact title match.");
  }

  if (derivedQuerySlug === normalizedSlug) {
    confidence = Math.max(confidence, 0.99);
    reasons.push("Exact slug match.");
  }

  if (normalizedTitle.startsWith(normalizedQuery) || normalizedSlug.startsWith(derivedQuerySlug)) {
    confidence = Math.max(confidence, 0.91);
    reasons.push("Starts with the requested name.");
  }

  if (
    normalizedTitle.includes(normalizedQuery) ||
    normalizedSlug.includes(derivedQuerySlug) ||
    normalizedQuery.includes(normalizedTitle)
  ) {
    confidence = Math.max(confidence, 0.82);
    reasons.push("Contains the requested name.");
  }

  const tokenOverlap = Math.max(scoreTokenOverlap(queryTokens, titleTokens), scoreTokenOverlap(queryTokens, slugTokens));

  if (tokenOverlap > 0) {
    confidence = Math.max(confidence, 0.55 + tokenOverlap * 0.3);
    reasons.push("Shares most of the meaningful name tokens.");
  }

  return {
    confidence: clampConfidence(confidence),
    reasons: dedupeReasons(reasons),
  };
}

function scoreTokenOverlap(queryTokens: string[], candidateTokens: string[]) {
  if (queryTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const candidateSet = new Set(candidateTokens);
  let overlap = 0;

  for (const token of queryTokens) {
    if (candidateSet.has(token)) {
      overlap += 1;
    }
  }

  return overlap / queryTokens.length;
}

function scoreCoordinateProximity(
  queryLatitude: number,
  queryLongitude: number,
  candidateLatitude: number,
  candidateLongitude: number,
) {
  const distanceKm = haversineDistanceKm(queryLatitude, queryLongitude, candidateLatitude, candidateLongitude);

  if (distanceKm <= 1) {
    return {
      bonus: 0.15,
      reasons: ["Coordinates are within about 1 km of the candidate listing."],
    };
  }

  if (distanceKm <= 5) {
    return {
      bonus: 0.08,
      reasons: ["Coordinates are within about 5 km of the candidate listing."],
    };
  }

  if (distanceKm <= 20) {
    return {
      bonus: 0.03,
      reasons: ["Coordinates are moderately close to the candidate listing."],
    };
  }

  return {
    bonus: 0,
    reasons: [],
  };
}

function haversineDistanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function normalizeMatchString(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function dedupeReasons(reasons: string[]) {
  return [...new Set(reasons)];
}

function normalizeDistinctSlugs(values: string[], label: string) {
  const normalized = values.map((value) => normalizeSlug(value, label));
  ensureDistinctValues(normalized, label);
  return normalized;
}

function validateListingImageInput(images: Array<{ imageUrl: string; sortOrder: number }>) {
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
