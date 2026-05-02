import { asc, eq, inArray } from "drizzle-orm";

import {
  cmsUserRoles,
  countries,
  countryModeratorCountryAssignments,
  destinationRegions,
  destinations,
  moderatorRegionAssignments,
  regions,
  user,
  type CmsRole,
  type DbInstance,
} from "@explorers-map/db";

import { ServiceError } from "./errors.ts";
import {
  requireNonEmptyString,
  requireOptionalString,
  resolveDb,
  type DbExecutor,
  type ResolvedListingRecord,
  type WriteContext,
} from "./shared.ts";

export type UserRoleRecord = {
  userId: string;
  role: CmsRole;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModeratorRegionAssignmentRecord = {
  userId: string;
  regionId: string;
  regionSlug: string;
  regionTitle: string;
  countryId: string;
  countrySlug: string;
  countryTitle: string;
  createdAt: string;
};

export type CountryModeratorCountryAssignmentRecord = {
  userId: string;
  countryId: string;
  countrySlug: string;
  countryTitle: string;
  createdAt: string;
};

export type DestinationRegionOption = {
  regionId: string;
  countryId: string;
  countrySlug: string;
  countryTitle: string;
  regionSlug: string;
  regionTitle: string;
};

export type ListingRegionOption = DestinationRegionOption;

export type ListingDestinationOption = {
  destinationId: string;
  countrySlug: string;
  countryTitle: string;
  destinationSlug: string;
  destinationTitle: string;
  regionTitles: string[];
};

export type AuthActorContext = {
  userId: string;
  role: CmsRole;
  moderatorRegionAssignments: ModeratorRegionAssignmentRecord[];
  countryModeratorCountryAssignments: CountryModeratorCountryAssignmentRecord[];
};

export function getUserRole(userId: string, dbInstance?: DbInstance): UserRoleRecord | null {
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const row = db.select().from(cmsUserRoles).where(eq(cmsUserRoles.userId, normalizedUserId)).get();

  return row ? mapUserRoleRow(row) : null;
}

export function ensureUserRole(userId: string, role: CmsRole = "viewer", dbInstance?: DbInstance): UserRoleRecord {
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const normalizedRole = requireCmsRole(role);

  db.insert(cmsUserRoles)
    .values({
      userId: normalizedUserId,
      role: normalizedRole,
    })
    .onConflictDoNothing()
    .run();

  return getUserRole(normalizedUserId, dbInstance) ?? setUserRole(normalizedUserId, normalizedRole, null, dbInstance);
}

export function setUserRole(
  userId: string,
  role: CmsRole,
  actorIdOrDbInstance?: string | null | DbInstance,
  dbInstance?: DbInstance,
): UserRoleRecord {
  const actorId = typeof actorIdOrDbInstance === "string" || actorIdOrDbInstance === null ? actorIdOrDbInstance : null;
  const resolvedDbInstance =
    typeof actorIdOrDbInstance === "object" && actorIdOrDbInstance !== null && "db" in actorIdOrDbInstance
      ? actorIdOrDbInstance
      : dbInstance;
  const { db } = resolveDb(resolvedDbInstance);
  return setUserRoleWithExecutor(db, userId, role, actorId);
}

export function setUserRoleWithExecutor(
  executor: DbExecutor,
  userId: string,
  role: CmsRole,
  actorId?: string | null,
): UserRoleRecord {
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const normalizedRole = requireCmsRole(role);
  const normalizedActorId = requireOptionalString(actorId, "actorId");
  const now = new Date();

  executor.insert(cmsUserRoles)
    .values({
      userId: normalizedUserId,
      role: normalizedRole,
      createdBy: normalizedActorId,
      updatedBy: normalizedActorId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cmsUserRoles.userId,
      set: {
        role: normalizedRole,
        updatedBy: normalizedActorId,
        updatedAt: now,
      },
    })
    .run();

  const row = executor
    .select()
    .from(cmsUserRoles)
    .where(eq(cmsUserRoles.userId, normalizedUserId))
    .get();

  return mapUserRoleRow(row!);
}

export function listModeratorRegionAssignments(
  userId: string,
  dbInstance?: DbInstance,
): ModeratorRegionAssignmentRecord[] {
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(userId, "userId");

  return db
    .select({
      userId: moderatorRegionAssignments.userId,
      regionId: moderatorRegionAssignments.regionId,
      regionSlug: regions.slug,
      regionTitle: regions.title,
      countryId: countries.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      createdAt: moderatorRegionAssignments.createdAt,
    })
    .from(moderatorRegionAssignments)
    .innerJoin(regions, eq(moderatorRegionAssignments.regionId, regions.id))
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(eq(moderatorRegionAssignments.userId, normalizedUserId))
    .orderBy(asc(countries.title), asc(regions.title))
    .all()
    .map((row) => ({
      userId: row.userId,
      regionId: row.regionId,
      regionSlug: row.regionSlug,
      regionTitle: row.regionTitle,
      countryId: row.countryId,
      countrySlug: row.countrySlug,
      countryTitle: row.countryTitle,
      createdAt: row.createdAt.toISOString(),
    }));
}

export function listCountryModeratorCountryAssignments(
  userId: string,
  dbInstance?: DbInstance,
): CountryModeratorCountryAssignmentRecord[] {
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(userId, "userId");

  return db
    .select({
      userId: countryModeratorCountryAssignments.userId,
      countryId: countryModeratorCountryAssignments.countryId,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      createdAt: countryModeratorCountryAssignments.createdAt,
    })
    .from(countryModeratorCountryAssignments)
    .innerJoin(countries, eq(countryModeratorCountryAssignments.countryId, countries.id))
    .where(eq(countryModeratorCountryAssignments.userId, normalizedUserId))
    .orderBy(asc(countries.title))
    .all()
    .map((row) => ({
      userId: row.userId,
      countryId: row.countryId,
      countrySlug: row.countrySlug,
      countryTitle: row.countryTitle,
      createdAt: row.createdAt.toISOString(),
    }));
}

export function listManageableDestinationRegionOptions(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  dbInstance?: DbInstance,
): DestinationRegionOption[] {
  assertCanAccessCms(actor);
  const cmsActor = actor!;
  const { db } = resolveDb(dbInstance);

  if (cmsActor.role === "admin") {
    return db
      .select({
        regionId: regions.id,
        countryId: countries.id,
        countrySlug: countries.slug,
        countryTitle: countries.title,
        regionSlug: regions.slug,
        regionTitle: regions.title,
      })
      .from(regions)
      .innerJoin(countries, eq(regions.countryId, countries.id))
      .orderBy(asc(countries.title), asc(regions.title))
      .all();
  }

  if (cmsActor.role === "country_moderator") {
    const manageableCountryIds = cmsActor.countryModeratorCountryAssignments.map((assignment) => assignment.countryId);

    if (manageableCountryIds.length === 0) {
      return [];
    }

    return db
      .select({
        regionId: regions.id,
        countryId: countries.id,
        countrySlug: countries.slug,
        countryTitle: countries.title,
        regionSlug: regions.slug,
        regionTitle: regions.title,
      })
      .from(regions)
      .innerJoin(countries, eq(regions.countryId, countries.id))
      .where(inArray(regions.countryId, manageableCountryIds))
      .orderBy(asc(countries.title), asc(regions.title))
      .all();
  }

  const manageableRegionIds = cmsActor.moderatorRegionAssignments.map((assignment) => assignment.regionId);

  if (manageableRegionIds.length === 0) {
    return [];
  }

  return db
    .select({
      regionId: regions.id,
      countryId: countries.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      regionSlug: regions.slug,
      regionTitle: regions.title,
    })
    .from(regions)
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(inArray(regions.id, manageableRegionIds))
    .orderBy(asc(countries.title), asc(regions.title))
    .all();
}

export function listManageableListingRegionOptions(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  dbInstance?: DbInstance,
): ListingRegionOption[] {
  return listManageableDestinationRegionOptions(actor, dbInstance);
}

export function getAuthActorContext(userId: string, dbInstance?: DbInstance): AuthActorContext {
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const role = getUserRole(normalizedUserId, dbInstance)?.role ?? "viewer";

  return {
    userId: normalizedUserId,
    role,
    moderatorRegionAssignments: listModeratorRegionAssignments(normalizedUserId, dbInstance),
    countryModeratorCountryAssignments: listCountryModeratorCountryAssignments(normalizedUserId, dbInstance),
  };
}

export function countAdminUsers(dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);

  return db.select().from(cmsUserRoles).where(eq(cmsUserRoles.role, "admin")).all().length;
}

export function hasAnyAdminUser(dbInstance?: DbInstance) {
  return countAdminUsers(dbInstance) > 0;
}

export function canAccessCms(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  return actor?.role === "admin" || actor?.role === "country_moderator" || actor?.role === "moderator";
}

export function canAccessAdminCms(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  return actor?.role === "admin";
}

export function canAccessCountryModeratorCms(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  return actor?.role === "admin" || actor?.role === "country_moderator";
}

export function assertCanAccessCms(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  if (!canAccessCms(actor)) {
    throw new ServiceError("FORBIDDEN", "You do not have access to the CMS.");
  }
}

export function requireAdminActor(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  if (!canAccessAdminCms(actor)) {
    throw new ServiceError("FORBIDDEN", "You do not have admin access to the CMS.");
  }
}

export function requireCountryModeratorActor(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  if (!canAccessCountryModeratorCms(actor)) {
    throw new ServiceError("FORBIDDEN", "You do not have country-level CMS access.");
  }
}

export function createCmsWriteContext(actor: AuthActorContext, source = "web"): WriteContext {
  assertCanAccessCms(actor);

  return {
    actorId: actor.userId,
    source: requireNonEmptyString(source, "source"),
  };
}

export function canManageCountrySlug(
  actor: Pick<AuthActorContext, "role" | "countryModeratorCountryAssignments"> | null | undefined,
  countrySlug: string,
) {
  const normalizedCountrySlug = requireNonEmptyString(countrySlug, "countrySlug");

  if (actor?.role === "admin") {
    return true;
  }

  if (actor?.role !== "country_moderator") {
    return false;
  }

  return actor.countryModeratorCountryAssignments.some((assignment) => assignment.countrySlug === normalizedCountrySlug);
}

export function assertCanManageCountrySlug(
  actor: Pick<AuthActorContext, "role" | "countryModeratorCountryAssignments"> | null | undefined,
  countrySlug: string,
) {
  requireCountryModeratorActor(actor);

  if (!canManageCountrySlug(actor, countrySlug)) {
    throw new ServiceError("FORBIDDEN", "You can only manage countries assigned to you.");
  }
}

export function canManageListingInRegion(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  regionId: string,
  dbInstance?: DbInstance,
) {
  const normalizedRegionId = requireNonEmptyString(regionId, "regionId");

  if (actor?.role === "admin") {
    return true;
  }

  if (actor?.role === "country_moderator") {
    const { db } = resolveDb(dbInstance);
    const region = db
      .select({
        countryId: regions.countryId,
      })
      .from(regions)
      .where(eq(regions.id, normalizedRegionId))
      .get();

    if (!region) {
      return false;
    }

    return actor.countryModeratorCountryAssignments.some((assignment) => assignment.countryId === region.countryId);
  }

  if (actor?.role !== "moderator") {
    return false;
  }

  return actor.moderatorRegionAssignments.some((assignment) => assignment.regionId === normalizedRegionId);
}

export function assertCanManageListingInRegion(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  regionId: string,
  dbInstance?: DbInstance,
) {
  assertCanAccessCms(actor);

  if (!canManageListingInRegion(actor, regionId, dbInstance)) {
    throw new ServiceError("FORBIDDEN", "You can only manage listings inside regions or countries you manage.");
  }
}

export function canManageListing(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  listing: Pick<ResolvedListingRecord, "regionId">,
  dbInstance?: DbInstance,
) {
  return canManageListingInRegion(actor, listing.regionId, dbInstance);
}

export function assertCanManageListing(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  listing: Pick<ResolvedListingRecord, "regionId">,
  dbInstance?: DbInstance,
) {
  assertCanManageListingInRegion(actor, listing.regionId, dbInstance);
}

export function canManageDestinationWithRegionIds(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  destinationRegionIds: string[],
  dbInstance?: DbInstance,
) {
  if (actor?.role === "admin") {
    return true;
  }

  const manageableRegionIds = new Set(
    listManageableDestinationRegionOptions(actor, dbInstance).map((assignment) => assignment.regionId),
  );

  if (actor?.role === "country_moderator") {
    return destinationRegionIds.every((regionId) => manageableRegionIds.has(regionId));
  }

  if (actor?.role !== "moderator") {
    return false;
  }

  return destinationRegionIds.some((regionId) => manageableRegionIds.has(regionId));
}

export function listManageableListingDestinationOptions(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  countrySlug: string,
  dbInstance?: DbInstance,
): ListingDestinationOption[] {
  assertCanAccessCms(actor);
  const cmsActor = actor!;
  const { db } = resolveDb(dbInstance);
  const normalizedCountrySlug = requireNonEmptyString(countrySlug, "countrySlug");
  const manageableRegionIds = new Set(
    listManageableDestinationRegionOptions(cmsActor, dbInstance).map((assignment) => assignment.regionId),
  );
  const rows = db
    .select({
      destinationId: destinations.id,
      countrySlug: countries.slug,
      countryTitle: countries.title,
      destinationSlug: destinations.slug,
      destinationTitle: destinations.title,
      regionId: regions.id,
      regionTitle: regions.title,
    })
    .from(destinationRegions)
    .innerJoin(destinations, eq(destinationRegions.destinationId, destinations.id))
    .innerJoin(countries, eq(destinations.countryId, countries.id))
    .innerJoin(regions, eq(destinationRegions.regionId, regions.id))
    .where(eq(countries.slug, normalizedCountrySlug))
    .orderBy(asc(destinations.title), asc(regions.title))
    .all();

  const options = new Map<string, ListingDestinationOption>();

  for (const row of rows) {
    if (cmsActor.role !== "admin" && !manageableRegionIds.has(row.regionId)) {
      continue;
    }

    const existing = options.get(row.destinationId);

    if (existing) {
      existing.regionTitles.push(row.regionTitle);
      continue;
    }

    options.set(row.destinationId, {
      destinationId: row.destinationId,
      countrySlug: row.countrySlug,
      countryTitle: row.countryTitle,
      destinationSlug: row.destinationSlug,
      destinationTitle: row.destinationTitle,
      regionTitles: [row.regionTitle],
    });
  }

  return Array.from(options.values());
}

export function canAssignListingDestinationIds(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  destinationIds: string[],
  dbInstance?: DbInstance,
) {
  assertCanAccessCms(actor);
  const cmsActor = actor!;
  const normalizedDestinationIds = Array.from(
    new Set(destinationIds.map((destinationId) => requireNonEmptyString(destinationId, "destinationId"))),
  );

  if (normalizedDestinationIds.length === 0 || cmsActor.role === "admin") {
    return true;
  }

  const { db } = resolveDb(dbInstance);
  const manageableRegionIds = new Set(
    listManageableDestinationRegionOptions(cmsActor, dbInstance).map((assignment) => assignment.regionId),
  );

  if (manageableRegionIds.size === 0) {
    return false;
  }

  const rows = db
    .select({
      destinationId: destinationRegions.destinationId,
      regionId: destinationRegions.regionId,
    })
    .from(destinationRegions)
    .where(inArray(destinationRegions.destinationId, normalizedDestinationIds))
    .all();

  const destinationCoverage = new Map<string, boolean>();

  for (const destinationId of normalizedDestinationIds) {
    destinationCoverage.set(destinationId, false);
  }

  for (const row of rows) {
    if (manageableRegionIds.has(row.regionId)) {
      destinationCoverage.set(row.destinationId, true);
    }
  }

  return normalizedDestinationIds.every((destinationId) => destinationCoverage.get(destinationId) === true);
}

export function assertCanAssignListingDestinationIds(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  destinationIds: string[],
  dbInstance?: DbInstance,
) {
  if (!canAssignListingDestinationIds(actor, destinationIds, dbInstance)) {
    throw new ServiceError(
      "FORBIDDEN",
      "You can only assign destinations that overlap at least one region or country you manage.",
    );
  }
}

export function assertCanManageDestinationWithRegionIds(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments"> | null | undefined,
  destinationRegionIds: string[],
  dbInstance?: DbInstance,
) {
  assertCanAccessCms(actor);

  if (!canManageDestinationWithRegionIds(actor, destinationRegionIds, dbInstance)) {
    throw new ServiceError(
      "FORBIDDEN",
      "You can only manage destinations that overlap the regions or countries you manage.",
    );
  }
}

export function resolveDestinationRegionIdsForActor(
  input: {
    actor:
      | Pick<AuthActorContext, "role" | "moderatorRegionAssignments" | "countryModeratorCountryAssignments">
      | null
      | undefined;
    submittedRegionIds: string[];
    existingRegionIds?: string[];
  },
  dbInstance?: DbInstance,
) {
  assertCanAccessCms(input.actor);
  const cmsActor = input.actor!;
  const submittedRegionIds = Array.from(
    new Set(input.submittedRegionIds.map((value) => requireNonEmptyString(value, "regionId"))),
  );
  const existingRegionIds = Array.from(
    new Set((input.existingRegionIds ?? []).map((value) => requireNonEmptyString(value, "existingRegionId"))),
  );
  const manageableRegionIds = new Set(
    listManageableDestinationRegionOptions(cmsActor, dbInstance).map((option) => option.regionId),
  );

  if (cmsActor.role === "admin") {
    if (submittedRegionIds.some((regionId) => !manageableRegionIds.has(regionId))) {
      throw new ServiceError("INVALID_INPUT", "One or more destination regions do not exist.");
    }

    return submittedRegionIds;
  }

  if (cmsActor.role === "country_moderator") {
    if (submittedRegionIds.some((regionId) => !manageableRegionIds.has(regionId))) {
      throw new ServiceError("FORBIDDEN", "You can only attach destinations to regions inside countries you manage.");
    }

    return submittedRegionIds;
  }

  if (submittedRegionIds.length === 0 && existingRegionIds.length === 0) {
    throw new ServiceError("FORBIDDEN", "Moderators must attach destinations to at least one region they manage.");
  }

  if (submittedRegionIds.some((regionId) => !manageableRegionIds.has(regionId))) {
    throw new ServiceError("FORBIDDEN", "You can only attach destinations to regions you manage.");
  }

  const preservedRegionIds = existingRegionIds.filter((regionId) => !manageableRegionIds.has(regionId));
  const finalRegionIds = Array.from(new Set([...preservedRegionIds, ...submittedRegionIds]));

  assertCanManageDestinationWithRegionIds(cmsActor, finalRegionIds, dbInstance);

  return finalRegionIds;
}

export function setModeratorRegionAssignments(
  userId: string,
  regionIds: string[],
  actorId?: string | null,
  dbInstance?: DbInstance,
) {
  const { db } = resolveDb(dbInstance);
  setModeratorRegionAssignmentsWithExecutor(db, userId, regionIds, actorId);
}

export function setModeratorRegionAssignmentsWithExecutor(
  executor: DbExecutor,
  userId: string,
  regionIds: string[],
  actorId?: string | null,
) {
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const normalizedActorId = requireOptionalString(actorId, "actorId");
  const normalizedRegionIds = Array.from(new Set(regionIds.map((value) => requireNonEmptyString(value, "regionId"))));

  const existingUser = executor
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.id, normalizedUserId))
    .get();

  if (!existingUser) {
    throw new ServiceError("NOT_FOUND", `User "${normalizedUserId}" was not found.`);
  }

  if (normalizedRegionIds.length > 0) {
    const existingRegions = executor
      .select({
        id: regions.id,
        countryId: regions.countryId,
      })
      .from(regions)
      .where(inArray(regions.id, normalizedRegionIds))
      .all();

    if (existingRegions.length !== normalizedRegionIds.length) {
      throw new ServiceError("INVALID_INPUT", "One or more moderator regions do not exist.");
    }

    const countryIds = new Set(existingRegions.map((region) => region.countryId));

    if (countryIds.size > 1) {
      throw new ServiceError("INVALID_INPUT", "Moderators can only be assigned regions from a single country.");
    }
  }

  executor.delete(moderatorRegionAssignments).where(eq(moderatorRegionAssignments.userId, normalizedUserId)).run();

  if (normalizedRegionIds.length === 0) {
    return;
  }

  executor.insert(moderatorRegionAssignments)
    .values(
      normalizedRegionIds.map((regionId) => ({
        userId: normalizedUserId,
        regionId,
        assignedBy: normalizedActorId,
      })),
    )
    .run();
}

export function setCountryModeratorCountryAssignments(
  userId: string,
  countryIds: string[],
  actorId?: string | null,
  dbInstance?: DbInstance,
) {
  const { db } = resolveDb(dbInstance);
  setCountryModeratorCountryAssignmentsWithExecutor(db, userId, countryIds, actorId);
}

export function setCountryModeratorCountryAssignmentsWithExecutor(
  executor: DbExecutor,
  userId: string,
  countryIds: string[],
  actorId?: string | null,
) {
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const normalizedActorId = requireOptionalString(actorId, "actorId");
  const normalizedCountryIds = Array.from(new Set(countryIds.map((value) => requireNonEmptyString(value, "countryId"))));

  const existingUser = executor
    .select({
      id: user.id,
    })
    .from(user)
    .where(eq(user.id, normalizedUserId))
    .get();

  if (!existingUser) {
    throw new ServiceError("NOT_FOUND", `User "${normalizedUserId}" was not found.`);
  }

  if (normalizedCountryIds.length > 0) {
    const existingCountries = executor
      .select({
        id: countries.id,
      })
      .from(countries)
      .where(inArray(countries.id, normalizedCountryIds))
      .all();

    if (existingCountries.length !== normalizedCountryIds.length) {
      throw new ServiceError("INVALID_INPUT", "One or more moderator countries do not exist.");
    }
  }

  executor.delete(countryModeratorCountryAssignments).where(eq(countryModeratorCountryAssignments.userId, normalizedUserId)).run();

  if (normalizedCountryIds.length === 0) {
    return;
  }

  executor.insert(countryModeratorCountryAssignments)
    .values(
      normalizedCountryIds.map((countryId) => ({
        userId: normalizedUserId,
        countryId,
        assignedBy: normalizedActorId,
      })),
    )
    .run();
}

export function mapUserRoleRow(row: typeof cmsUserRoles.$inferSelect): UserRoleRecord {
  return {
    userId: row.userId,
    role: requireCmsRole(row.role),
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function requireCmsRole(value: string): CmsRole {
  if (value !== "admin" && value !== "country_moderator" && value !== "moderator" && value !== "viewer") {
    throw new ServiceError(
      "INVALID_INPUT",
      "role must be one of admin, country_moderator, moderator, or viewer.",
    );
  }

  return value;
}
