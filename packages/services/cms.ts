import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import {
  countries,
  regions,
  user,
  type CmsRole,
  type DbInstance,
} from "@explorers-map/db";

import { deriveSlug } from "./editorial.ts";
import { ServiceError } from "./errors.ts";
import {
  countAdminUsers,
  getAuthActorContext,
  requireAdminActor,
  setModeratorRegionAssignmentsWithExecutor,
  setUserRoleWithExecutor,
  type AuthActorContext,
  type ModeratorRegionAssignmentRecord,
} from "./auth.ts";
import { mapSqliteError, requireCountryRecord, requireNonEmptyString, resolveDb } from "./shared.ts";

export type CmsUserSummary = {
  userId: string;
  name: string;
  email: string;
  role: CmsRole;
  moderatorRegionAssignments: ModeratorRegionAssignmentRecord[];
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

export function listCmsUsers(dbInstance?: DbInstance): CmsUserSummary[] {
  const { db } = resolveDb(dbInstance);

  return db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.name), asc(user.email))
    .all()
    .map((row) => {
      const actor = getAuthActorContext(row.userId, dbInstance);

      return {
        userId: row.userId,
        name: row.name,
        email: row.email,
        role: actor.role,
        moderatorRegionAssignments: actor.moderatorRegionAssignments,
        createdAt: row.createdAt.toISOString(),
      };
    });
}

export function getCmsUserDetail(userId: string, dbInstance?: DbInstance): CmsUserDetail | null {
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

  const actor = getAuthActorContext(normalizedUserId, dbInstance);

  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: actor.role,
    moderatorRegionAssignments: actor.moderatorRegionAssignments,
    createdAt: row.createdAt.toISOString(),
  };
}

export function listModeratorRegionOptions(dbInstance?: DbInstance): ModeratorRegionOption[] {
  const { db } = resolveDb(dbInstance);

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

export function updateCmsUserAccess(
  input: UpdateCmsUserAccessInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
) {
  requireAdminActor(actor);
  const { db } = resolveDb(dbInstance);
  const normalizedUserId = requireNonEmptyString(input.userId, "userId");
  const normalizedRole = input.role;
  const moderatorRegionIds = normalizeModeratorRegionIds(input.moderatorRegionIds);
  const existingUser = getCmsUserDetail(normalizedUserId, dbInstance);

  if (!existingUser) {
    throw new ServiceError("NOT_FOUND", `User "${normalizedUserId}" was not found.`);
  }

  if (existingUser.role === "admin" && normalizedRole !== "admin" && countAdminUsers(dbInstance) <= 1) {
    throw new ServiceError("INVALID_STATE", "You cannot demote the last remaining admin.");
  }

  if (normalizedRole === "moderator" && moderatorRegionIds.length === 0) {
    throw new ServiceError("INVALID_INPUT", "Moderators must have at least one assigned region.");
  }

  return db.transaction((tx) => {
    const roleRecord = setUserRoleWithExecutor(tx, normalizedUserId, normalizedRole, actor.userId);

    if (normalizedRole === "moderator") {
      setModeratorRegionAssignmentsWithExecutor(tx, normalizedUserId, moderatorRegionIds, actor.userId);
    } else {
      setModeratorRegionAssignmentsWithExecutor(tx, normalizedUserId, [], actor.userId);
    }

    return roleRecord;
  });
}

export function listCountriesForCms(dbInstance?: DbInstance): CountryCmsRecord[] {
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
    .map(mapCountryRow);
}

export function getCountryForCms(countrySlug: string, dbInstance?: DbInstance): CountryCmsRecord | null {
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

  return row ? mapCountryRow(row) : null;
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

  return getCountryForCms(slug, dbInstance)!;
}

export function updateCountryForCms(input: UpsertCountryInput, actor: AuthActorContext, dbInstance?: DbInstance) {
  requireAdminActor(actor);
  const { db } = resolveDb(dbInstance);
  const currentSlug = requireNonEmptyString(input.currentSlug ?? "", "currentSlug");
  const current = getCountryForCms(currentSlug, dbInstance);

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

  return getCountryForCms(slug, dbInstance)!;
}

export function listRegionsForCms(dbInstance?: DbInstance): RegionCmsRecord[] {
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
    .map(mapRegionRow);
}

export function getRegionForCms(countrySlug: string, regionSlug: string, dbInstance?: DbInstance): RegionCmsRecord | null {
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

  return row ? mapRegionRow(row) : null;
}

export function createRegionForCms(input: UpsertRegionInput, actor: AuthActorContext, dbInstance?: DbInstance) {
  requireAdminActor(actor);
  const { db } = resolveDb(dbInstance);
  const country = requireCountryRecord(db, input.countrySlug);
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

  return getRegionForCms(country.slug, slug, dbInstance)!;
}

export function updateRegionForCms(input: UpsertRegionInput, actor: AuthActorContext, dbInstance?: DbInstance) {
  requireAdminActor(actor);
  const { db } = resolveDb(dbInstance);
  const currentCountrySlug = requireNonEmptyString(input.currentCountrySlug ?? "", "currentCountrySlug");
  const currentRegionSlug = requireNonEmptyString(input.currentRegionSlug ?? "", "currentRegionSlug");
  const current = getRegionForCms(currentCountrySlug, currentRegionSlug, dbInstance);

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

  return getRegionForCms(country.slug, slug, dbInstance)!;
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
