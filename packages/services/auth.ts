import { asc, eq, inArray } from "drizzle-orm";

import {
  cmsUserRoles,
  countries,
  moderatorRegionAssignments,
  regions,
  user,
  type CmsRole,
  type DbInstance,
} from "@explorers-map/db";

import { ServiceError } from "./errors.ts";
import { requireNonEmptyString, requireOptionalString, resolveDb, type DbExecutor, type WriteContext } from "./shared.ts";

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
  countrySlug: string;
  createdAt: string;
};

export type DestinationRegionOption = {
  regionId: string;
  countrySlug: string;
  countryTitle: string;
  regionSlug: string;
  regionTitle: string;
};

export type AuthActorContext = {
  userId: string;
  role: CmsRole;
  moderatorRegionAssignments: ModeratorRegionAssignmentRecord[];
};

export function getUserRole(userId: string, dbInstance?: DbInstance): UserRoleRecord | null {
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const row = db
    .select()
    .from(cmsUserRoles)
    .where(eq(cmsUserRoles.userId, normalizedUserId))
    .get();

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
      countrySlug: countries.slug,
      createdAt: moderatorRegionAssignments.createdAt,
    })
    .from(moderatorRegionAssignments)
    .innerJoin(regions, eq(moderatorRegionAssignments.regionId, regions.id))
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(eq(moderatorRegionAssignments.userId, normalizedUserId))
    .orderBy(asc(regions.title))
    .all()
    .map((row) => ({
      userId: row.userId,
      regionId: row.regionId,
      regionSlug: row.regionSlug,
      regionTitle: row.regionTitle,
      countrySlug: row.countrySlug,
      createdAt: row.createdAt.toISOString(),
    }));
}

export function listManageableDestinationRegionOptions(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments"> | null | undefined,
  dbInstance?: DbInstance,
): DestinationRegionOption[] {
  assertCanAccessCms(actor);
  const cmsActor = actor!;
  const { db } = resolveDb(dbInstance);

  if (cmsActor.role === "admin") {
    return db
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
  }

  const manageableRegionIds = cmsActor.moderatorRegionAssignments.map((assignment) => assignment.regionId);

  if (manageableRegionIds.length === 0) {
    return [];
  }

  return db
    .select({
      regionId: regions.id,
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

export function getAuthActorContext(userId: string, dbInstance?: DbInstance): AuthActorContext {
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const role = getUserRole(normalizedUserId, dbInstance)?.role ?? "viewer";

  return {
    userId: normalizedUserId,
    role,
    moderatorRegionAssignments: listModeratorRegionAssignments(normalizedUserId, dbInstance),
  };
}

export function countAdminUsers(dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);

  return db
    .select()
    .from(cmsUserRoles)
    .where(eq(cmsUserRoles.role, "admin"))
    .all().length;
}

export function hasAnyAdminUser(dbInstance?: DbInstance) {
  return countAdminUsers(dbInstance) > 0;
}

export function canAccessCms(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  return actor?.role === "admin" || actor?.role === "moderator";
}

export function canAccessAdminCms(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  return actor?.role === "admin";
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

export function createCmsWriteContext(actor: AuthActorContext, source = "web"): WriteContext {
  assertCanAccessCms(actor);

  return {
    actorId: actor.userId,
    source: requireNonEmptyString(source, "source"),
  };
}

export function canManageDestinationWithRegionIds(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments"> | null | undefined,
  destinationRegionIds: string[],
) {
  if (actor?.role === "admin") {
    return true;
  }

  if (actor?.role !== "moderator") {
    return false;
  }

  const manageableRegionIds = new Set(actor.moderatorRegionAssignments.map((assignment) => assignment.regionId));
  return destinationRegionIds.some((regionId) => manageableRegionIds.has(regionId));
}

export function assertCanManageDestinationWithRegionIds(
  actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments"> | null | undefined,
  destinationRegionIds: string[],
) {
  assertCanAccessCms(actor);

  if (!canManageDestinationWithRegionIds(actor, destinationRegionIds)) {
    throw new ServiceError(
      "FORBIDDEN",
      "You can only manage destinations that overlap at least one region you manage.",
    );
  }
}

export function resolveDestinationRegionIdsForActor(
  input: {
    actor: Pick<AuthActorContext, "role" | "moderatorRegionAssignments"> | null | undefined;
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

  if (submittedRegionIds.length === 0 && existingRegionIds.length === 0) {
    throw new ServiceError("FORBIDDEN", "Moderators must attach destinations to at least one region they manage.");
  }

  if (submittedRegionIds.some((regionId) => !manageableRegionIds.has(regionId))) {
    throw new ServiceError("FORBIDDEN", "You can only attach destinations to regions you manage.");
  }

  const preservedRegionIds = existingRegionIds.filter((regionId) => !manageableRegionIds.has(regionId));
  const finalRegionIds = Array.from(new Set([...preservedRegionIds, ...submittedRegionIds]));

  assertCanManageDestinationWithRegionIds(cmsActor, finalRegionIds);

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
      })
      .from(regions)
      .where(inArray(regions.id, normalizedRegionIds))
      .all();

    if (existingRegions.length !== normalizedRegionIds.length) {
      throw new ServiceError("INVALID_INPUT", "One or more moderator regions do not exist.");
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
  if (value !== "admin" && value !== "moderator" && value !== "viewer") {
    throw new ServiceError("INVALID_INPUT", "role must be one of admin, moderator, or viewer.");
  }

  return value;
}
