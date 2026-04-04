import { asc, eq } from "drizzle-orm";

import {
  cmsUserRoles,
  countries,
  moderatorRegionAssignments,
  regions,
  type CmsRole,
  type DbInstance,
} from "@explorers-map/db";

import { ServiceError } from "./errors.ts";
import { requireNonEmptyString, resolveDb, type WriteContext } from "./shared.ts";

export type UserRoleRecord = {
  userId: string;
  role: CmsRole;
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

  return getUserRole(normalizedUserId, dbInstance) ?? setUserRole(normalizedUserId, normalizedRole, dbInstance);
}

export function setUserRole(userId: string, role: CmsRole, dbInstance?: DbInstance): UserRoleRecord {
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(userId, "userId");
  const normalizedRole = requireCmsRole(role);
  const now = new Date();

  db.insert(cmsUserRoles)
    .values({
      userId: normalizedUserId,
      role: normalizedRole,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: cmsUserRoles.userId,
      set: {
        role: normalizedRole,
        updatedAt: now,
      },
    })
    .run();

  return getUserRole(normalizedUserId, dbInstance)!;
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

export function assertCanAccessCms(actor: Pick<AuthActorContext, "role"> | null | undefined) {
  if (!canAccessCms(actor)) {
    throw new ServiceError("FORBIDDEN", "You do not have access to the CMS.");
  }
}

export function createCmsWriteContext(actor: AuthActorContext, source = "web"): WriteContext {
  assertCanAccessCms(actor);

  return {
    actorId: actor.userId,
    source: requireNonEmptyString(source, "source"),
  };
}

function mapUserRoleRow(row: typeof cmsUserRoles.$inferSelect): UserRoleRecord {
  return {
    userId: row.userId,
    role: requireCmsRole(row.role),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function requireCmsRole(value: string): CmsRole {
  if (value !== "admin" && value !== "moderator" && value !== "viewer") {
    throw new ServiceError("INVALID_INPUT", "role must be one of admin, moderator, or viewer.");
  }

  return value;
}
