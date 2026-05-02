import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";

import {
  categories,
  countries,
  destinationRegions,
  destinations,
  listingDestinations,
  listings,
  regions,
  user,
  type CmsRole,
  type DbInstance,
} from "@explorers-map/db";

import { deriveSlug } from "./editorial.ts";
import { ServiceError } from "./errors.ts";
import {
  assertCanManageCountrySlug,
  assertCanAssignListingDestinationIds,
  assertCanManageDestinationWithRegionIds,
  assertCanManageListing,
  assertCanManageListingInRegion,
  canManageCountrySlug,
  countAdminUsers,
  createCmsWriteContext,
  getAuthActorContext,
  listManageableDestinationRegionOptions,
  listManageableListingDestinationOptions,
  requireAdminActor,
  requireCountryModeratorActor,
  resolveDestinationRegionIdsForActor,
  setCountryModeratorCountryAssignmentsWithExecutor,
  setModeratorRegionAssignmentsWithExecutor,
  setUserRoleWithExecutor,
  type AuthActorContext,
  type CountryModeratorCountryAssignmentRecord,
  type DestinationRegionOption,
  type ModeratorRegionAssignmentRecord,
} from "./auth.ts";
import {
  assignListingDestinations,
  createListingDraft,
  publishListing,
  restoreListing,
  setListingLocation,
  trashListing,
  unpublishListing,
  updateListingCopyAndMetadata,
} from "./listings.ts";
import { mapSqliteError, requireCountryRecord, requireListingRecord, requireNonEmptyString, requireOptionalString, requireRegionRecordById, resolveDb } from "./shared.ts";

export type CmsUserSummary = {
  userId: string;
  name: string;
  email: string;
  role: CmsRole;
  moderatorRegionAssignments: ModeratorRegionAssignmentRecord[];
  countryModeratorCountryAssignments: CountryModeratorCountryAssignmentRecord[];
  createdAt: string;
};

export type CmsUserDetail = CmsUserSummary;

export type ModeratorRegionOption = {
  regionId: string;
  countrySlug: string;
  countryTitle: string;
  regionSlug: string;
  regionTitle: string;
};

export type UpdateCmsUserAccessInput = {
  userId: string;
  role: CmsRole;
  moderatorRegionIds?: string[];
  countryModeratorCountryIds?: string[];
};

export type CountryCmsRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertCountryInput = {
  currentSlug?: string;
  title: string;
  slug?: string;
  description: string;
  coverImage: string;
};

export type RegionCmsRecord = {
  id: string;
  countrySlug: string;
  countryTitle: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertRegionInput = {
  currentCountrySlug?: string;
  currentRegionSlug?: string;
  countrySlug: string;
  title: string;
  slug?: string;
  description: string;
  coverImage: string;
};

export type DestinationCmsRegionRecord = DestinationRegionOption & {
  manageableByActor: boolean;
};

export type DestinationCmsRecord = {
  id: string;
  countrySlug: string;
  countryTitle: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  regions: DestinationCmsRegionRecord[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertDestinationInput = {
  currentCountrySlug?: string;
  currentDestinationSlug?: string;
  countrySlug: string;
  title: string;
  slug?: string;
  description: string;
  coverImage?: string | null;
  regionIds: string[];
};

export type ListingCmsDestinationRecord = {
  destinationId: string;
  destinationSlug: string;
  destinationTitle: string;
  manageableByActor: boolean;
};

export type ListingCmsRecord = {
  id: string;
  countrySlug: string;
  countryTitle: string;
  regionId: string;
  regionSlug: string;
  regionTitle: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  deletedAt: string | null;
  shortDescription: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  busynessRating: number | null;
  googleMapsPlaceUrl: string | null;
  coverImage: string | null;
  category: {
    slug: string;
    title: string;
  } | null;
  destinations: ListingCmsDestinationRecord[];
  source: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCmsListingInput = {
  regionId: string;
  title: string;
  slug?: string;
  shortDescription: string;
  description: string;
  coverImage?: string | null;
  categorySlug?: string | null;
  busynessRating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsPlaceUrl?: string | null;
  destinationIds: string[];
};

export type UpdateCmsListingInput = {
  currentCountrySlug: string;
  currentRegionSlug: string;
  currentListingSlug: string;
  title: string;
  slug?: string;
  shortDescription: string;
  description: string;
  coverImage?: string | null;
  categorySlug?: string | null;
  busynessRating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsPlaceUrl?: string | null;
  destinationIds: string[];
};

export function listCmsUsers(actor: AuthActorContext, dbInstance?: DbInstance): CmsUserSummary[] {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);

  const users = db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.name), asc(user.email))
    .all()
    .map((row) => buildCmsUserSummary(row, dbInstance));

  return users.filter((record) => canActorManageCmsUser(actor, record));
}

export function getCmsUserDetail(userId: string, actor: AuthActorContext, dbInstance?: DbInstance): CmsUserDetail | null {
  requireCountryModeratorActor(actor);
  const userDetail = getCmsUserDetailInternal(userId, dbInstance);

  if (!userDetail) {
    return null;
  }

  if (!canActorManageCmsUser(actor, userDetail)) {
    throw new ServiceError("FORBIDDEN", "You can only manage users within your allowed scope.");
  }

  return userDetail;
}

function getCmsUserDetailInternal(userId: string, dbInstance?: DbInstance): CmsUserDetail | null {
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const row = db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, normalizedUserId))
    .get();

  if (!row) {
    return null;
  }

  return buildCmsUserSummary(row, dbInstance);
}

export function listModeratorRegionOptions(actor: AuthActorContext, dbInstance?: DbInstance): ModeratorRegionOption[] {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);

  const rows = db
    .select({
      regionId: regions.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      regionSlug: regions.slug,
      regionTitle: regions.title,
    })
    .from(regions)
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .orderBy(asc(countries.title), asc(regions.title))
    .all();

  return rows.filter((row) => actor.role === "admin" || canManageCountrySlug(actor, row.countrySlug));
}

export function updateCmsUserAccess(
  input: UpdateCmsUserAccessInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(input.userId, "userId");
  const normalizedRole = input.role;
  const moderatorRegionIds = normalizeModeratorRegionIds(input.moderatorRegionIds);
  const countryModeratorCountryIds = normalizeCountryIds(input.countryModeratorCountryIds);
  const existingUser = getCmsUserDetailInternal(normalizedUserId, dbInstance);

  if (!existingUser) {
    throw new ServiceError("NOT_FOUND", `User "${normalizedUserId}" was not found.`);
  }

  assertActorCanManageCmsUserAccess(actor, existingUser);

  if (existingUser.role === "admin" && normalizedRole !== "admin" && countAdminUsers(dbInstance) <= 1) {
    throw new ServiceError("INVALID_STATE", "You cannot demote the last remaining admin.");
  }

  if (normalizedRole === "moderator" && moderatorRegionIds.length === 0) {
    throw new ServiceError("INVALID_INPUT", "Moderators must have at least one assigned region.");
  }

  if (normalizedRole === "country_moderator" && countryModeratorCountryIds.length === 0) {
    throw new ServiceError("INVALID_INPUT", "Country moderators must have at least one assigned country.");
  }

  if (actor.role !== "admin" && (normalizedRole === "admin" || normalizedRole === "country_moderator")) {
    throw new ServiceError("FORBIDDEN", "Only admins can create or manage admin and country moderator users.");
  }

  assertActorCanAssignModeratorRegions(actor, moderatorRegionIds, dbInstance);

  return db.transaction((tx) => {
    const roleRecord = setUserRoleWithExecutor(tx, normalizedUserId, normalizedRole, actor.userId);

    if (normalizedRole === "moderator") {
      setModeratorRegionAssignmentsWithExecutor(tx, normalizedUserId, moderatorRegionIds, actor.userId);
    } else {
      setModeratorRegionAssignmentsWithExecutor(tx, normalizedUserId, [], actor.userId);
    }

    if (normalizedRole === "country_moderator") {
      requireAdminActor(actor);
      setCountryModeratorCountryAssignmentsWithExecutor(tx, normalizedUserId, countryModeratorCountryIds, actor.userId);
    } else {
      setCountryModeratorCountryAssignmentsWithExecutor(tx, normalizedUserId, [], actor.userId);
    }

    return roleRecord;
  });
}

export function assertCanPrepareCmsUserAccess(
  input: Omit<UpdateCmsUserAccessInput, "userId">,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  requireCountryModeratorActor(actor);
  const normalizedRole = input.role;
  const moderatorRegionIds = normalizeModeratorRegionIds(input.moderatorRegionIds);
  const countryModeratorCountryIds = normalizeCountryIds(input.countryModeratorCountryIds);

  if (normalizedRole === "moderator" && moderatorRegionIds.length === 0) {
    throw new ServiceError("INVALID_INPUT", "Moderators must have at least one assigned region.");
  }

  if (normalizedRole === "country_moderator" && countryModeratorCountryIds.length === 0) {
    throw new ServiceError("INVALID_INPUT", "Country moderators must have at least one assigned country.");
  }

  if (actor.role !== "admin" && (normalizedRole === "admin" || normalizedRole === "country_moderator")) {
    throw new ServiceError("FORBIDDEN", "Only admins can create admin and country moderator users.");
  }

  assertActorCanAssignModeratorRegions(actor, moderatorRegionIds, dbInstance);
}

export function listCountriesForCms(actor: AuthActorContext, dbInstance?: DbInstance): CountryCmsRecord[] {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);

  return db
    .select({
      id: countries.id,
      slug: countries.slug,
      title: countries.title,
      description: countries.description,
      coverImage: countries.coverImage,
      createdAt: countries.createdAt,
      updatedAt: countries.updatedAt,
    })
    .from(countries)
    .orderBy(asc(countries.title))
    .all()
    .map(mapCountryRow)
    .filter((country) => actor.role === "admin" || canManageCountrySlug(actor, country.slug));
}

export function getCountryForCms(countrySlug: string, actor: AuthActorContext, dbInstance?: DbInstance): CountryCmsRecord | null {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);
  const normalizedCountrySlug = requireNonEmptyString(countrySlug, "countrySlug");
  const row = db
    .select({
      id: countries.id,
      slug: countries.slug,
      title: countries.title,
      description: countries.description,
      coverImage: countries.coverImage,
      createdAt: countries.createdAt,
      updatedAt: countries.updatedAt,
    })
    .from(countries)
    .where(eq(countries.slug, normalizedCountrySlug))
    .get();

  if (!row) {
    return null;
  }

  const country = mapCountryRow(row);

  if (actor.role !== "admin" && !canManageCountrySlug(actor, country.slug)) {
    throw new ServiceError("FORBIDDEN", "You can only manage countries assigned to you.");
  }

  return country;
}

export function createCountryForCms(input: UpsertCountryInput, actor: AuthActorContext, dbInstance?: DbInstance) {
  requireAdminActor(actor);
  const { db } = resolveDb(dbInstance);
  const title = requireNonEmptyString(input.title, "title");
  const description = requireNonEmptyString(input.description, "description");
  const coverImage = requireNonEmptyString(input.coverImage, "coverImage");
  const slug = deriveSlug(input.slug, title, "country");
  const now = new Date();

  try {
    db.insert(countries)
      .values({
        id: randomUUID(),
        slug,
        title,
        description,
        coverImage,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  } catch (error) {
    mapSqliteError(error, `Country slug "${slug}" already exists.`);
  }

  return getCountryForCms(slug, actor, dbInstance)!;
}

export function updateCountryForCms(input: UpsertCountryInput, actor: AuthActorContext, dbInstance?: DbInstance) {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);
  const currentSlug = requireNonEmptyString(input.currentSlug ?? "", "currentSlug");
  const current = getCountryForCms(currentSlug, actor, dbInstance);

  if (!current) {
    throw new ServiceError("NOT_FOUND", `Country "${currentSlug}" was not found.`);
  }

  const title = requireNonEmptyString(input.title, "title");
  const description = requireNonEmptyString(input.description, "description");
  const coverImage = requireNonEmptyString(input.coverImage, "coverImage");
  const slug = deriveSlug(input.slug, title, "country");

  if (slug !== current.slug) {
    const collision = db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.slug, slug))
      .get();

    if (collision) {
      throw new ServiceError("CONFLICT", `Country slug "${slug}" already exists.`);
    }
  }

  try {
    db.update(countries)
      .set({
        slug,
        title,
        description,
        coverImage,
        updatedAt: new Date(),
      })
      .where(eq(countries.id, current.id))
      .run();
  } catch (error) {
    mapSqliteError(error, `Country slug "${slug}" already exists.`);
  }

  return getCountryForCms(slug, actor, dbInstance)!;
}

export function listRegionsForCms(actor: AuthActorContext, dbInstance?: DbInstance): RegionCmsRecord[] {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);

  return db
    .select({
      id: regions.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      slug: regions.slug,
      title: regions.title,
      description: regions.description,
      coverImage: regions.coverImage,
      createdAt: regions.createdAt,
      updatedAt: regions.updatedAt,
    })
    .from(regions)
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .orderBy(asc(countries.title), asc(regions.title))
    .all()
    .map(mapRegionRow)
    .filter((region) => actor.role === "admin" || canManageCountrySlug(actor, region.countrySlug));
}

export function listDestinationsForCms(actor: AuthActorContext, dbInstance?: DbInstance): DestinationCmsRecord[] {
  const { db } = resolveDb(dbInstance);
  const manageableRegionIds = getManageableDestinationRegionIdSet(actor, dbInstance);
  const rows = db
    .select({
      id: destinations.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      slug: destinations.slug,
      title: destinations.title,
      description: destinations.description,
      coverImage: destinations.coverImage,
      createdBy: destinations.createdBy,
      updatedBy: destinations.updatedBy,
      createdAt: destinations.createdAt,
      updatedAt: destinations.updatedAt,
    })
    .from(destinations)
    .innerJoin(countries, eq(destinations.countryId, countries.id))
    .orderBy(asc(countries.title), asc(destinations.title))
    .all();

  const regionMap = loadDestinationCmsRegions(
    rows.map((row) => row.id),
    manageableRegionIds,
    dbInstance,
  );

  return rows
    .map((row) => mapDestinationRow(row, regionMap.get(row.id) ?? []))
    .filter((destination) => {
      if (actor.role === "admin") {
        return true;
      }

      if (actor.role === "country_moderator") {
        return canManageCountrySlug(actor, destination.countrySlug);
      }

      return destination.regions.some((region) => region.manageableByActor);
    });
}

export function getDestinationForCms(
  countrySlug: string,
  destinationSlug: string,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): DestinationCmsRecord | null {
  const { db } = resolveDb(dbInstance);
  const normalizedCountrySlug = requireNonEmptyString(countrySlug, "countrySlug");
  const normalizedDestinationSlug = requireNonEmptyString(destinationSlug, "destinationSlug");
  const manageableRegionIds = getManageableDestinationRegionIdSet(actor, dbInstance);
  const row = db
    .select({
      id: destinations.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      slug: destinations.slug,
      title: destinations.title,
      description: destinations.description,
      coverImage: destinations.coverImage,
      createdBy: destinations.createdBy,
      updatedBy: destinations.updatedBy,
      createdAt: destinations.createdAt,
      updatedAt: destinations.updatedAt,
    })
    .from(destinations)
    .innerJoin(countries, eq(destinations.countryId, countries.id))
    .where(and(eq(countries.slug, normalizedCountrySlug), eq(destinations.slug, normalizedDestinationSlug)))
    .get();

  if (!row) {
    return null;
  }

  const regions = loadDestinationCmsRegions([row.id], manageableRegionIds, dbInstance).get(row.id) ?? [];
  const destination = mapDestinationRow(row, regions);

  if (actor.role === "country_moderator") {
    assertCanManageCountrySlug(actor, destination.countrySlug);
  }

  assertCanManageDestinationWithRegionIds(
    actor,
    destination.regions.map((region) => region.regionId),
    dbInstance,
  );

  return destination;
}

export function getRegionForCms(
  countrySlug: string,
  regionSlug: string,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): RegionCmsRecord | null {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);
  const normalizedCountrySlug = requireNonEmptyString(countrySlug, "countrySlug");
  const normalizedRegionSlug = requireNonEmptyString(regionSlug, "regionSlug");
  const row = db
    .select({
      id: regions.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      slug: regions.slug,
      title: regions.title,
      description: regions.description,
      coverImage: regions.coverImage,
      createdAt: regions.createdAt,
      updatedAt: regions.updatedAt,
    })
    .from(regions)
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(and(eq(countries.slug, normalizedCountrySlug), eq(regions.slug, normalizedRegionSlug)))
    .get();

  if (!row) {
    return null;
  }

  const region = mapRegionRow(row);

  if (actor.role !== "admin" && !canManageCountrySlug(actor, region.countrySlug)) {
    throw new ServiceError("FORBIDDEN", "You can only manage regions inside countries assigned to you.");
  }

  return region;
}

export function createRegionForCms(input: UpsertRegionInput, actor: AuthActorContext, dbInstance?: DbInstance) {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);
  if (actor.role !== "admin") {
    assertCanManageCountrySlug(actor, country.slug);
  }
  const title = requireNonEmptyString(input.title, "title");
  const description = requireNonEmptyString(input.description, "description");
  const coverImage = requireNonEmptyString(input.coverImage, "coverImage");
  const slug = deriveSlug(input.slug, title, "region");
  const now = new Date();

  try {
    db.insert(regions)
      .values({
        id: randomUUID(),
        countryId: country.id,
        slug,
        title,
        description,
        coverImage,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  } catch (error) {
    mapSqliteError(error, `Region slug "${slug}" already exists in country "${country.slug}".`);
  }

  return getRegionForCms(country.slug, slug, actor, dbInstance)!;
}

export function updateRegionForCms(input: UpsertRegionInput, actor: AuthActorContext, dbInstance?: DbInstance) {
  requireCountryModeratorActor(actor);
  const { db } = resolveDb(dbInstance);
  const currentCountrySlug = requireNonEmptyString(input.currentCountrySlug ?? "", "currentCountrySlug");
  const currentRegionSlug = requireNonEmptyString(input.currentRegionSlug ?? "", "currentRegionSlug");
  const current = getRegionForCms(currentCountrySlug, currentRegionSlug, actor, dbInstance);

  if (!current) {
    throw new ServiceError(
      "NOT_FOUND",
      `Region "${currentRegionSlug}" was not found in country "${currentCountrySlug}".`,
    );
  }

  const country = requireCountryRecord(db, input.countrySlug);

  if (country.slug !== current.countrySlug) {
    throw new ServiceError("INVALID_INPUT", "Region country cannot be changed in Phase 9.");
  }

  if (actor.role !== "admin") {
    assertCanManageCountrySlug(actor, country.slug);
  }

  const title = requireNonEmptyString(input.title, "title");
  const description = requireNonEmptyString(input.description, "description");
  const coverImage = requireNonEmptyString(input.coverImage, "coverImage");
  const slug = deriveSlug(input.slug, title, "region");

  if (slug !== current.slug) {
    const collision = db
      .select({ id: regions.id })
      .from(regions)
      .where(and(eq(regions.countryId, country.id), eq(regions.slug, slug)))
      .get();

    if (collision) {
      throw new ServiceError("CONFLICT", `Region slug "${slug}" already exists in country "${country.slug}".`);
    }
  }

  try {
    db.update(regions)
      .set({
        slug,
        title,
        description,
        coverImage,
        updatedAt: new Date(),
      })
      .where(eq(regions.id, current.id))
      .run();
  } catch (error) {
    mapSqliteError(error, `Region slug "${slug}" already exists in country "${country.slug}".`);
  }

  return getRegionForCms(country.slug, slug, actor, dbInstance)!;
}

export function createDestinationForCms(
  input: UpsertDestinationInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);
  if (actor.role === "country_moderator") {
    assertCanManageCountrySlug(actor, country.slug);
  }
  const title = requireNonEmptyString(input.title, "title");
  const description = requireNonEmptyString(input.description, "description");
  const coverImage = requireOptionalString(input.coverImage, "coverImage");
  const slug = deriveSlug(input.slug, title, "destination");
  const regionIds = resolveDestinationRegionIdsForActor(
    {
      actor,
      submittedRegionIds: input.regionIds,
    },
    dbInstance,
  );
  const regionRecords = requireDestinationRegionRecords(regionIds, country.id, country.slug, dbInstance);
  const now = new Date();

  try {
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
          createdBy: actor.userId,
          updatedBy: actor.userId,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      if (regionRecords.length > 0) {
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
  } catch (error) {
    mapSqliteError(error, `Destination slug "${slug}" already exists in country "${country.slug}".`);
  }

  return getDestinationForCms(country.slug, slug, actor, dbInstance)!;
}

export function updateDestinationForCms(
  input: UpsertDestinationInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const { db } = resolveDb(dbInstance);
  const currentCountrySlug = requireNonEmptyString(input.currentCountrySlug ?? "", "currentCountrySlug");
  const currentDestinationSlug = requireNonEmptyString(input.currentDestinationSlug ?? "", "currentDestinationSlug");
  const current = getDestinationForCms(currentCountrySlug, currentDestinationSlug, actor, dbInstance);

  if (!current) {
    throw new ServiceError(
      "NOT_FOUND",
      `Destination "${currentDestinationSlug}" was not found in country "${currentCountrySlug}".`,
    );
  }

  const country = requireCountryRecord(db, input.countrySlug);

  if (country.slug !== current.countrySlug) {
    throw new ServiceError("INVALID_INPUT", "Destination country cannot be changed in Phase 10a.");
  }

  const title = requireNonEmptyString(input.title, "title");
  const description = requireNonEmptyString(input.description, "description");
  const coverImage = requireOptionalString(input.coverImage, "coverImage");
  const slug = deriveSlug(input.slug, title, "destination");
  const regionIds = resolveDestinationRegionIdsForActor(
    {
      actor,
      existingRegionIds: current.regions.map((region) => region.regionId),
      submittedRegionIds: input.regionIds,
    },
    dbInstance,
  );
  const regionRecords = requireDestinationRegionRecords(regionIds, country.id, country.slug, dbInstance);

  if (slug !== current.slug) {
    const collision = db
      .select({ id: destinations.id })
      .from(destinations)
      .where(and(eq(destinations.countryId, country.id), eq(destinations.slug, slug)))
      .get();

    if (collision) {
      throw new ServiceError("CONFLICT", `Destination slug "${slug}" already exists in country "${country.slug}".`);
    }
  }

  try {
    db.transaction((tx) => {
      tx.update(destinations)
        .set({
          slug,
          title,
          description,
          coverImage,
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(destinations.id, current.id))
        .run();

      tx.delete(destinationRegions).where(eq(destinationRegions.destinationId, current.id)).run();

      if (regionRecords.length > 0) {
        tx.insert(destinationRegions)
          .values(
            regionRecords.map((region) => ({
              destinationId: current.id,
              regionId: region.id,
            })),
          )
          .run();
      }
    });
  } catch (error) {
    mapSqliteError(error, `Destination slug "${slug}" already exists in country "${country.slug}".`);
  }

  return getDestinationForCms(country.slug, slug, actor, dbInstance)!;
}

export function listListingsForCms(actor: AuthActorContext, dbInstance?: DbInstance): ListingCmsRecord[] {
  const { db } = resolveDb(dbInstance);
  const rows =
    actor.role === "admin"
      ? db
          .select({
            id: listings.id,
            countrySlug: countries.slug,
            countryTitle: countries.title,
            regionId: regions.id,
            regionSlug: regions.slug,
            regionTitle: regions.title,
            slug: listings.slug,
            title: listings.title,
            status: listings.status,
            deletedAt: listings.deletedAt,
            shortDescription: listings.shortDescription,
            description: listings.description,
            latitude: listings.latitude,
            longitude: listings.longitude,
            busynessRating: listings.busynessRating,
            googleMapsPlaceUrl: listings.googleMapsPlaceUrl,
            coverImage: listings.coverImage,
            categorySlug: categories.slug,
            categoryTitle: categories.title,
            source: listings.source,
            createdBy: listings.createdBy,
            updatedBy: listings.updatedBy,
            createdAt: listings.createdAt,
            updatedAt: listings.updatedAt,
          })
          .from(listings)
          .innerJoin(regions, eq(listings.regionId, regions.id))
          .innerJoin(countries, eq(regions.countryId, countries.id))
          .leftJoin(categories, eq(listings.categorySlug, categories.slug))
          .orderBy(asc(countries.title), asc(regions.title), asc(listings.title))
          .all()
      : actor.role === "country_moderator"
        ? actor.countryModeratorCountryAssignments.length === 0
          ? []
          : db
              .select({
                id: listings.id,
                countrySlug: countries.slug,
                countryTitle: countries.title,
                regionId: regions.id,
                regionSlug: regions.slug,
                regionTitle: regions.title,
                slug: listings.slug,
                title: listings.title,
                status: listings.status,
                deletedAt: listings.deletedAt,
                shortDescription: listings.shortDescription,
                description: listings.description,
                latitude: listings.latitude,
                longitude: listings.longitude,
                busynessRating: listings.busynessRating,
                googleMapsPlaceUrl: listings.googleMapsPlaceUrl,
                coverImage: listings.coverImage,
                categorySlug: categories.slug,
                categoryTitle: categories.title,
                source: listings.source,
                createdBy: listings.createdBy,
                updatedBy: listings.updatedBy,
                createdAt: listings.createdAt,
                updatedAt: listings.updatedAt,
              })
              .from(listings)
              .innerJoin(regions, eq(listings.regionId, regions.id))
              .innerJoin(countries, eq(regions.countryId, countries.id))
              .leftJoin(categories, eq(listings.categorySlug, categories.slug))
              .where(inArray(regions.countryId, actor.countryModeratorCountryAssignments.map((assignment) => assignment.countryId)))
              .orderBy(asc(countries.title), asc(regions.title), asc(listings.title))
              .all()
      : actor.moderatorRegionAssignments.length === 0
        ? []
        : db
            .select({
              id: listings.id,
              countrySlug: countries.slug,
              countryTitle: countries.title,
              regionId: regions.id,
              regionSlug: regions.slug,
              regionTitle: regions.title,
              slug: listings.slug,
              title: listings.title,
              status: listings.status,
              deletedAt: listings.deletedAt,
              shortDescription: listings.shortDescription,
              description: listings.description,
              latitude: listings.latitude,
              longitude: listings.longitude,
              busynessRating: listings.busynessRating,
              googleMapsPlaceUrl: listings.googleMapsPlaceUrl,
              coverImage: listings.coverImage,
              categorySlug: categories.slug,
              categoryTitle: categories.title,
              source: listings.source,
              createdBy: listings.createdBy,
              updatedBy: listings.updatedBy,
              createdAt: listings.createdAt,
              updatedAt: listings.updatedAt,
            })
            .from(listings)
            .innerJoin(regions, eq(listings.regionId, regions.id))
            .innerJoin(countries, eq(regions.countryId, countries.id))
            .leftJoin(categories, eq(listings.categorySlug, categories.slug))
            .where(inArray(listings.regionId, actor.moderatorRegionAssignments.map((assignment) => assignment.regionId)))
            .orderBy(asc(countries.title), asc(regions.title), asc(listings.title))
            .all();

  const manageableDestinationIds = buildManageableDestinationIdSet(
    actor,
    Array.from(new Set(rows.map((row) => row.countrySlug))),
    dbInstance,
  );
  const destinationMap = loadListingCmsDestinations(
    rows.map((row) => row.id),
    manageableDestinationIds,
    dbInstance,
  );

  return rows.map((row) => mapListingRow(row, destinationMap.get(row.id) ?? []));
}

export function getListingForCms(
  countrySlug: string,
  regionSlug: string,
  listingSlug: string,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): ListingCmsRecord | null {
  let listing;

  try {
    listing = requireListingForCmsAccess({ countrySlug, regionSlug, listingSlug }, actor, dbInstance);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      return null;
    }

    throw error;
  }

  const manageableDestinationIds = buildManageableDestinationIdSet(actor, [listing.countrySlug], dbInstance);
  const destinations = loadListingCmsDestinations([listing.id], manageableDestinationIds, dbInstance).get(listing.id) ?? [];

  return mapListingRow(
    {
      id: listing.id,
      countrySlug: listing.countrySlug,
      countryTitle: listing.countryTitle,
      regionId: listing.regionId,
      regionSlug: listing.regionSlug,
      regionTitle: listing.regionTitle,
      slug: listing.listingSlug,
      title: listing.title,
      status: listing.status,
      deletedAt: listing.deletedAt,
      shortDescription: listing.shortDescription,
      description: listing.description,
      latitude: listing.latitude,
      longitude: listing.longitude,
      busynessRating: listing.busynessRating,
      googleMapsPlaceUrl: listing.googleMapsPlaceUrl,
      coverImage: listing.coverImage,
      categorySlug: listing.categorySlug,
      categoryTitle: listing.categoryTitle,
      source: listing.source,
      createdBy: listing.createdBy,
      updatedBy: listing.updatedBy,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    },
    destinations,
  );
}

export function createListingForCms(
  input: CreateCmsListingInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const { db } = resolveDb(dbInstance);
  const region = requireRegionRecordById(db, input.regionId);
  assertCanManageListingInRegion(actor, region.id, dbInstance);

  const title = requireNonEmptyString(input.title, "title");
  const slug = deriveSlug(input.slug, title, "listing");
  const destinationIds = resolveListingDestinationIdsForActor(
    {
      actor,
      countrySlug: region.countrySlug,
      submittedDestinationIds: input.destinationIds,
    },
    dbInstance,
  );

  const destinationRecords = requireListingDestinationRecords(destinationIds, region.countrySlug, dbInstance);
  const writeContext = createCmsWriteContext(actor);

  createListingDraft(
    {
      countrySlug: region.countrySlug,
      regionSlug: region.slug,
      slug,
      title,
      shortDescription: requireNonEmptyString(input.shortDescription, "shortDescription"),
      description: requireNonEmptyString(input.description, "description"),
      latitude: input.latitude,
      longitude: input.longitude,
      busynessRating: input.busynessRating,
      googleMapsPlaceUrl: requireOptionalString(input.googleMapsPlaceUrl, "googleMapsPlaceUrl"),
      coverImage: requireOptionalString(input.coverImage, "coverImage"),
      categorySlug: requireOptionalString(input.categorySlug, "categorySlug"),
    },
    writeContext,
    dbInstance,
  );

  if (destinationRecords.length > 0) {
    assignListingDestinations(
      {
        countrySlug: region.countrySlug,
        regionSlug: region.slug,
        listingSlug: slug,
      },
      destinationRecords.map((destination) => ({
        countrySlug: destination.countrySlug,
        destinationSlug: destination.destinationSlug,
      })),
      writeContext,
      dbInstance,
    );
  }

  return getListingForCms(region.countrySlug, region.slug, slug, actor, dbInstance)!;
}

export function updateListingForCms(
  input: UpdateCmsListingInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const current = requireListingForCmsAccess(
    {
      countrySlug: input.currentCountrySlug,
      regionSlug: input.currentRegionSlug,
      listingSlug: input.currentListingSlug,
    },
    actor,
    dbInstance,
  );
  const title = requireNonEmptyString(input.title, "title");
  const slug = deriveSlug(input.slug, title, "listing");
  const destinationIds = resolveListingDestinationIdsForActor(
    {
      actor,
      countrySlug: current.countrySlug,
      submittedDestinationIds: input.destinationIds,
      existingDestinationIds: currentDestinationsForListing(current.id, dbInstance),
    },
    dbInstance,
  );
  const destinationRecords = requireListingDestinationRecords(destinationIds, current.countrySlug, dbInstance);
  const locator = {
    countrySlug: current.countrySlug,
    regionSlug: current.regionSlug,
    listingSlug: current.listingSlug,
  };
  const writeContext = createCmsWriteContext(actor);

  const updatedCopy = updateListingCopyAndMetadata(
    locator,
    {
      slug,
      title,
      shortDescription: requireNonEmptyString(input.shortDescription, "shortDescription"),
      description: requireNonEmptyString(input.description, "description"),
      coverImage: requireOptionalString(input.coverImage, "coverImage"),
      categorySlug: requireOptionalString(input.categorySlug, "categorySlug"),
      busynessRating: input.busynessRating,
    },
    writeContext,
    dbInstance,
  );

  setListingLocation(
    {
      countrySlug: updatedCopy.countrySlug,
      regionSlug: updatedCopy.regionSlug,
      listingSlug: updatedCopy.listingSlug,
    },
    {
      latitude: input.latitude,
      longitude: input.longitude,
      googleMapsPlaceUrl: requireOptionalString(input.googleMapsPlaceUrl, "googleMapsPlaceUrl"),
    },
    writeContext,
    dbInstance,
  );

  assignListingDestinations(
    {
      countrySlug: updatedCopy.countrySlug,
      regionSlug: updatedCopy.regionSlug,
      listingSlug: updatedCopy.listingSlug,
    },
    destinationRecords.map((destination) => ({
      countrySlug: destination.countrySlug,
      destinationSlug: destination.destinationSlug,
    })),
    writeContext,
    dbInstance,
  );

  return getListingForCms(updatedCopy.countrySlug, updatedCopy.regionSlug, updatedCopy.listingSlug, actor, dbInstance)!;
}

export function publishListingForCms(
  input: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const current = requireListingForCmsAccess(input, actor, dbInstance);
  const result = publishListing(
    {
      countrySlug: current.countrySlug,
      regionSlug: current.regionSlug,
      listingSlug: current.listingSlug,
    },
    createCmsWriteContext(actor),
    dbInstance,
  );

  return getListingForCms(result.countrySlug, result.regionSlug, result.listingSlug, actor, dbInstance)!;
}

export function unpublishListingForCms(
  input: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const current = requireListingForCmsAccess(input, actor, dbInstance);
  const result = unpublishListing(
    {
      countrySlug: current.countrySlug,
      regionSlug: current.regionSlug,
      listingSlug: current.listingSlug,
    },
    createCmsWriteContext(actor),
    dbInstance,
  );

  return getListingForCms(result.countrySlug, result.regionSlug, result.listingSlug, actor, dbInstance)!;
}

export function trashListingForCms(
  input: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const current = requireListingForCmsAccess(input, actor, dbInstance);
  const result = trashListing(
    {
      countrySlug: current.countrySlug,
      regionSlug: current.regionSlug,
      listingSlug: current.listingSlug,
    },
    createCmsWriteContext(actor),
    dbInstance,
  );

  return getListingForCms(result.countrySlug, result.regionSlug, result.listingSlug, actor, dbInstance)!;
}

export function restoreListingForCms(
  input: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const current = requireListingForCmsAccess(input, actor, dbInstance);
  const result = restoreListing(
    {
      countrySlug: current.countrySlug,
      regionSlug: current.regionSlug,
      listingSlug: current.listingSlug,
    },
    createCmsWriteContext(actor),
    dbInstance,
  );

  return getListingForCms(result.countrySlug, result.regionSlug, result.listingSlug, actor, dbInstance)!;
}

function normalizeModeratorRegionIds(regionIds: string[] | undefined) {
  return Array.from(
    new Set(
      (regionIds ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function normalizeCountryIds(countryIds: string[] | undefined) {
  return Array.from(
    new Set(
      (countryIds ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function buildCmsUserSummary(
  row: {
    userId: string;
    name: string;
    email: string;
    createdAt: Date;
  },
  dbInstance?: DbInstance,
): CmsUserSummary {
  const actor = getAuthActorContext(row.userId, dbInstance);

  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: actor.role,
    moderatorRegionAssignments: actor.moderatorRegionAssignments,
    countryModeratorCountryAssignments: actor.countryModeratorCountryAssignments,
    createdAt: row.createdAt.toISOString(),
  };
}

function canActorManageCmsUser(actor: AuthActorContext, targetUser: CmsUserSummary) {
  if (actor.role === "admin") {
    return true;
  }

  if (actor.role !== "country_moderator") {
    return false;
  }

  if (targetUser.role === "viewer") {
    return true;
  }

  if (targetUser.role !== "moderator" || targetUser.moderatorRegionAssignments.length === 0) {
    return false;
  }

  const manageableCountrySlugs = new Set(
    actor.countryModeratorCountryAssignments.map((assignment) => assignment.countrySlug),
  );

  return targetUser.moderatorRegionAssignments.every((assignment) => manageableCountrySlugs.has(assignment.countrySlug));
}

function assertActorCanManageCmsUserAccess(actor: AuthActorContext, targetUser: CmsUserSummary) {
  if (!canActorManageCmsUser(actor, targetUser)) {
    throw new ServiceError("FORBIDDEN", "You can only manage users within your allowed scope.");
  }
}

function assertActorCanAssignModeratorRegions(
  actor: AuthActorContext,
  moderatorRegionIds: string[],
  dbInstance?: DbInstance,
) {
  if (moderatorRegionIds.length === 0 || actor.role === "admin") {
    return;
  }

  const { db } = resolveDb(dbInstance);
  const rows = db
    .select({
      regionId: regions.id,
      countrySlug: countries.slug,
    })
    .from(regions)
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(inArray(regions.id, moderatorRegionIds))
    .all();

  if (rows.length !== moderatorRegionIds.length) {
    throw new ServiceError("INVALID_INPUT", "One or more moderator regions do not exist.");
  }

  const manageableCountrySlugs = new Set(
    actor.countryModeratorCountryAssignments.map((assignment) => assignment.countrySlug),
  );

  if (rows.some((row) => !manageableCountrySlugs.has(row.countrySlug))) {
    throw new ServiceError("FORBIDDEN", "You can only assign moderators to regions inside countries you manage.");
  }
}

function mapCountryRow(row: {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  createdAt: Date;
  updatedAt: Date;
}): CountryCmsRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImage: row.coverImage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapRegionRow(row: {
  id: string;
  countrySlug: string;
  countryTitle: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  createdAt: Date;
  updatedAt: Date;
}): RegionCmsRecord {
  return {
    id: row.id,
    countrySlug: row.countrySlug,
    countryTitle: row.countryTitle,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImage: row.coverImage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getManageableDestinationRegionIdSet(actor: AuthActorContext, dbInstance?: DbInstance) {
  return new Set(listManageableDestinationRegionOptions(actor, dbInstance).map((option) => option.regionId));
}

function loadDestinationCmsRegions(
  destinationIds: string[],
  manageableRegionIds: Set<string>,
  dbInstance?: DbInstance,
) {
  const { db } = resolveDb(dbInstance);
  const regionsByDestinationId = new Map<string, DestinationCmsRegionRecord[]>();

  if (destinationIds.length === 0) {
    return regionsByDestinationId;
  }

  const rows = db
    .select({
      destinationId: destinationRegions.destinationId,
      regionId: regions.id,
      countryId: countries.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      regionSlug: regions.slug,
      regionTitle: regions.title,
    })
    .from(destinationRegions)
    .innerJoin(regions, eq(destinationRegions.regionId, regions.id))
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(inArray(destinationRegions.destinationId, destinationIds))
    .orderBy(asc(regions.title))
    .all();

  for (const row of rows) {
    const bucket = regionsByDestinationId.get(row.destinationId) ?? [];
    bucket.push({
      regionId: row.regionId,
      countryId: row.countryId,
      countrySlug: row.countrySlug,
      countryTitle: row.countryTitle,
      regionSlug: row.regionSlug,
      regionTitle: row.regionTitle,
      manageableByActor: manageableRegionIds.has(row.regionId),
    });
    regionsByDestinationId.set(row.destinationId, bucket);
  }

  return regionsByDestinationId;
}

function loadListingCmsDestinations(
  listingIds: string[],
  manageableDestinationIds: Set<string>,
  dbInstance?: DbInstance,
) {
  const destinationsByListingId = new Map<string, ListingCmsDestinationRecord[]>();
  const { db } = resolveDb(dbInstance);

  if (listingIds.length === 0) {
    return destinationsByListingId;
  }

  const rows = db
    .select({
      listingId: listingDestinations.listingId,
      destinationId: destinations.id,
      destinationSlug: destinations.slug,
      destinationTitle: destinations.title,
    })
    .from(listingDestinations)
    .innerJoin(destinations, eq(listingDestinations.destinationId, destinations.id))
    .where(inArray(listingDestinations.listingId, listingIds))
    .orderBy(asc(destinations.title))
    .all();

  for (const row of rows) {
    const bucket = destinationsByListingId.get(row.listingId) ?? [];
    bucket.push({
      destinationId: row.destinationId,
      destinationSlug: row.destinationSlug,
      destinationTitle: row.destinationTitle,
      manageableByActor: manageableDestinationIds.has(row.destinationId),
    });
    destinationsByListingId.set(row.listingId, bucket);
  }

  return destinationsByListingId;
}

function mapDestinationRow(
  row: {
    id: string;
    countrySlug: string;
    countryTitle: string;
    slug: string;
    title: string;
    description: string;
    coverImage: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  regions: DestinationCmsRegionRecord[],
): DestinationCmsRecord {
  return {
    id: row.id,
    countrySlug: row.countrySlug,
    countryTitle: row.countryTitle,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImage: row.coverImage,
    regions,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapListingRow(
  row: {
    id: string;
    countrySlug: string;
    countryTitle: string;
    regionId: string;
    regionSlug: string;
    regionTitle: string;
    slug: string;
    title: string;
    status: "draft" | "published";
    deletedAt: Date | null;
    shortDescription: string;
    description: string;
    latitude: number | null;
    longitude: number | null;
    busynessRating: number | null;
    googleMapsPlaceUrl: string | null;
    coverImage: string | null;
    categorySlug: string | null;
    categoryTitle: string | null;
    source: string;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  destinations: ListingCmsDestinationRecord[],
): ListingCmsRecord {
  return {
    id: row.id,
    countrySlug: row.countrySlug,
    countryTitle: row.countryTitle,
    regionId: row.regionId,
    regionSlug: row.regionSlug,
    regionTitle: row.regionTitle,
    slug: row.slug,
    title: row.title,
    status: row.status,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    shortDescription: row.shortDescription,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    busynessRating: row.busynessRating,
    googleMapsPlaceUrl: row.googleMapsPlaceUrl,
    coverImage: row.coverImage,
    category:
      row.categorySlug && row.categoryTitle
        ? {
            slug: row.categorySlug,
            title: row.categoryTitle,
          }
        : null,
    destinations,
    source: row.source,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function requireDestinationRegionRecords(regionIds: string[], countryId: string, countrySlug: string, dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);

  if (regionIds.length === 0) {
    return [];
  }

  const records = db
    .select({
      id: regions.id,
      countryId: regions.countryId,
    })
    .from(regions)
    .where(inArray(regions.id, regionIds))
    .all();

  if (records.length !== regionIds.length) {
    throw new ServiceError("INVALID_INPUT", "One or more destination regions do not exist.");
  }

  if (records.some((region) => region.countryId !== countryId)) {
    throw new ServiceError(
      "INVALID_INPUT",
      `Destination regions must belong to country "${countrySlug}".`,
    );
  }

  return records;
}

function requireListingDestinationRecords(destinationIds: string[], countrySlug: string, dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);

  if (destinationIds.length === 0) {
    return [];
  }

  const records = db
    .select({
      id: destinations.id,
      countrySlug: countries.slug,
      destinationSlug: destinations.slug,
    })
    .from(destinations)
    .innerJoin(countries, eq(destinations.countryId, countries.id))
    .where(inArray(destinations.id, destinationIds))
    .all();

  if (records.length !== destinationIds.length) {
    throw new ServiceError("INVALID_INPUT", "One or more listing destinations do not exist.");
  }

  if (records.some((destination) => destination.countrySlug !== countrySlug)) {
    throw new ServiceError("INVALID_INPUT", `Listing destinations must belong to country "${countrySlug}".`);
  }

  return records;
}

function buildManageableDestinationIdSet(
  actor: AuthActorContext,
  countrySlugs: string[],
  dbInstance?: DbInstance,
) {
  if (actor.role === "admin") {
    const { db } = resolveDb(dbInstance);
    const normalizedCountrySlugs = Array.from(new Set(countrySlugs.map((countrySlug) => countrySlug.trim()).filter(Boolean)));

    if (normalizedCountrySlugs.length === 0) {
      return new Set<string>();
    }

    return new Set(
      db
        .select({ destinationId: destinations.id })
        .from(destinations)
        .innerJoin(countries, eq(destinations.countryId, countries.id))
        .where(inArray(countries.slug, normalizedCountrySlugs))
        .all()
        .map((row) => row.destinationId),
    );
  }

  return new Set(
    Array.from(new Set(countrySlugs.map((countrySlug) => countrySlug.trim()).filter(Boolean))).flatMap((countrySlug) =>
      listManageableListingDestinationOptions(actor, countrySlug, dbInstance).map((option) => option.destinationId),
    ),
  );
}

function requireListingForCmsAccess(
  locator: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  const { db } = resolveDb(dbInstance);
  const listing = requireListingRecord(db, locator);
  assertCanManageListing(actor, listing, dbInstance);
  return listing;
}

function currentDestinationsForListing(listingId: string, dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);

  return db
    .select({
      destinationId: listingDestinations.destinationId,
    })
    .from(listingDestinations)
    .where(eq(listingDestinations.listingId, listingId))
    .all()
    .map((row) => row.destinationId);
}

function resolveListingDestinationIdsForActor(
  input: {
    actor: AuthActorContext;
    countrySlug: string;
    submittedDestinationIds: string[];
    existingDestinationIds?: string[];
  },
  dbInstance?: DbInstance,
) {
  const submittedDestinationIds = Array.from(
    new Set(input.submittedDestinationIds.map((destinationId) => requireNonEmptyString(destinationId, "destinationId"))),
  );
  const existingDestinationIds = Array.from(
    new Set((input.existingDestinationIds ?? []).map((destinationId) => requireNonEmptyString(destinationId, "destinationId"))),
  );

  if (input.actor.role === "admin") {
    return submittedDestinationIds;
  }

  const manageableDestinationIds = new Set(
    listManageableListingDestinationOptions(input.actor, input.countrySlug, dbInstance).map((option) => option.destinationId),
  );

  if (submittedDestinationIds.some((destinationId) => !manageableDestinationIds.has(destinationId))) {
    assertCanAssignListingDestinationIds(input.actor, submittedDestinationIds, dbInstance);
    throw new ServiceError(
      "FORBIDDEN",
      input.actor.role === "country_moderator"
        ? "You can only assign destinations inside countries you manage."
        : "You can only assign destinations that overlap at least one region you manage in this country.",
    );
  }

  if (input.actor.role === "country_moderator") {
    return submittedDestinationIds;
  }

  const preservedDestinationIds = existingDestinationIds.filter((destinationId) => !manageableDestinationIds.has(destinationId));
  return Array.from(new Set([...preservedDestinationIds, ...submittedDestinationIds]));
}
