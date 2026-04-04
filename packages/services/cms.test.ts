import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";

import { moderatorRegionAssignments, regions, user } from "@explorers-map/db";

import {
  createCountryForCms,
  createRegionForCms,
  getAuthActorContext,
  getCmsUserDetail,
  getCountryBySlug,
  getRegionBySlug,
  listCmsUsers,
  setUserRole,
  updateCmsUserAccess,
  updateCountryForCms,
  updateRegionForCms,
} from "./index.ts";
import { ServiceError } from "./errors.ts";
import { createSeededTestDb } from "./test-helpers.ts";

test("admin can manage CMS roles, moderator assignments, and user listings", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values([
    {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
    },
    {
      id: "user-1",
      name: "Moderator Candidate",
      email: "moderator@example.com",
    },
  ]).run();

  setUserRole("admin-1", "admin", dbInstance);
  setUserRole("user-1", "viewer", dbInstance);

  const dorset = dbInstance.db
    .select({ id: regions.id })
    .from(regions)
    .where(eq(regions.slug, "dorset"))
    .get();

  assert.ok(dorset);

  const adminActor = getAuthActorContext("admin-1", dbInstance);

  assert.throws(
    () => updateCmsUserAccess({ userId: "user-1", role: "moderator", moderatorRegionIds: [] }, adminActor, dbInstance),
    (error) => error instanceof ServiceError && error.code === "INVALID_INPUT",
  );

  const roleRecord = updateCmsUserAccess(
    {
      userId: "user-1",
      role: "moderator",
      moderatorRegionIds: [dorset.id],
    },
    adminActor,
    dbInstance,
  );

  assert.equal(roleRecord.role, "moderator");
  assert.equal(roleRecord.updatedBy, "admin-1");

  const detail = getCmsUserDetail("user-1", dbInstance);
  assert.equal(detail?.role, "moderator");
  assert.equal(detail?.moderatorRegionAssignments.length, 1);
  assert.equal(detail?.moderatorRegionAssignments[0]?.regionSlug, "dorset");

  const assignmentRow = dbInstance.sqlite
    .prepare("select assigned_by from moderator_region_assignments where user_id = ? and region_id = ?")
    .get("user-1", dorset.id) as { assigned_by: string | null } | undefined;

  assert.equal(assignmentRow?.assigned_by, "admin-1");
  assert.ok(listCmsUsers(dbInstance).some((record) => record.userId === "user-1" && record.role === "moderator"));

  updateCmsUserAccess(
    {
      userId: "user-1",
      role: "viewer",
    },
    adminActor,
    dbInstance,
  );

  assert.equal(getCmsUserDetail("user-1", dbInstance)?.moderatorRegionAssignments.length, 0);
  assert.equal(
    dbInstance.db.select().from(moderatorRegionAssignments).where(eq(moderatorRegionAssignments.userId, "user-1")).all().length,
    0,
  );
});

test("last remaining admin cannot be demoted", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();

  setUserRole("admin-1", "admin", dbInstance);

  assert.throws(
    () =>
      updateCmsUserAccess(
        {
          userId: "admin-1",
          role: "viewer",
        },
        getAuthActorContext("admin-1", dbInstance),
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "INVALID_STATE",
  );
});

test("admin country and region updates preserve canonical slug behavior and region uniqueness stays country-scoped", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();

  setUserRole("admin-1", "admin", dbInstance);
  const adminActor = getAuthActorContext("admin-1", dbInstance);

  const france = createCountryForCms(
    {
      title: "France",
      description: "Atlantic coastline and alpine regions.",
      coverImage: "https://example.com/france.jpg",
    },
    adminActor,
    dbInstance,
  );

  const franceRegion = createRegionForCms(
    {
      countrySlug: france.slug,
      title: "North Coast",
      description: "Windswept coastline with long beaches.",
      coverImage: "https://example.com/north-coast.jpg",
    },
    adminActor,
    dbInstance,
  );

  const ukRegion = createRegionForCms(
    {
      countrySlug: "united-kingdom",
      title: "North Coast",
      description: "A different region using the same slug in another country.",
      coverImage: "https://example.com/uk-north-coast.jpg",
    },
    adminActor,
    dbInstance,
  );

  assert.equal(franceRegion.slug, "north-coast");
  assert.equal(ukRegion.slug, "north-coast");

  assert.throws(
    () =>
      createRegionForCms(
        {
          countrySlug: france.slug,
          title: "North Coast",
          description: "Duplicate slug inside the same country.",
          coverImage: "https://example.com/duplicate.jpg",
        },
        adminActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "CONFLICT",
  );

  const updatedCountry = updateCountryForCms(
    {
      currentSlug: france.slug,
      title: "France West",
      slug: "france-west",
      description: "Updated country slug.",
      coverImage: "https://example.com/france-west.jpg",
    },
    adminActor,
    dbInstance,
  );

  assert.equal(updatedCountry.slug, "france-west");
  assert.equal(getCountryBySlug("france", dbInstance), null);
  assert.equal(getCountryBySlug("france-west", dbInstance)?.title, "France West");

  const updatedRegion = updateRegionForCms(
    {
      currentCountrySlug: updatedCountry.slug,
      currentRegionSlug: franceRegion.slug,
      countrySlug: updatedCountry.slug,
      title: "Northern Dunes",
      slug: "northern-dunes",
      description: "Updated region slug.",
      coverImage: "https://example.com/northern-dunes.jpg",
    },
    adminActor,
    dbInstance,
  );

  assert.equal(updatedRegion.slug, "northern-dunes");
  assert.equal(getRegionBySlug({ countrySlug: updatedCountry.slug, regionSlug: "north-coast" }, dbInstance), null);
  assert.equal(
    getRegionBySlug({ countrySlug: updatedCountry.slug, regionSlug: "northern-dunes" }, dbInstance)?.title,
    "Northern Dunes",
  );
});
