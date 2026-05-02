import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";

import { countries, moderatorRegionAssignments, regions, user } from "@explorers-map/db";

import {
  createCmsWriteContext,
  ensureUserRole,
  getAuthActorContext,
  hasAnyAdminUser,
  setCountryModeratorCountryAssignments,
  setModeratorRegionAssignments,
  setUserRole,
} from "./index.ts";
import { ServiceError } from "./errors.ts";
import { createSeededTestDb } from "./test-helpers.ts";

test("user roles and moderator assignments resolve into shared actor context", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "user-1",
    name: "Regional Moderator",
    email: "moderator@example.com",
  }).run();

  ensureUserRole("user-1", "viewer", dbInstance);
  setUserRole("user-1", "moderator", dbInstance);

  const dorset = dbInstance.db
    .select({
      id: regions.id,
    })
    .from(regions)
    .where(eq(regions.slug, "dorset"))
    .get();

  assert.ok(dorset);

  dbInstance.db.insert(moderatorRegionAssignments).values({
    userId: "user-1",
    regionId: dorset.id,
  }).run();

  const actor = getAuthActorContext("user-1", dbInstance);

  assert.equal(actor.role, "moderator");
  assert.equal(actor.moderatorRegionAssignments.length, 1);
  assert.equal(actor.moderatorRegionAssignments[0]?.regionSlug, "dorset");
});

test("cms write context requires a CMS-capable role and admin detection stays accurate", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "user-2",
    name: "Viewer User",
    email: "viewer@example.com",
  }).run();

  ensureUserRole("user-2", "viewer", dbInstance);

  assert.equal(hasAnyAdminUser(dbInstance), false);

  assert.throws(
    () => createCmsWriteContext(getAuthActorContext("user-2", dbInstance)),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );

  setUserRole("user-2", "admin", dbInstance);

  const writeContext = createCmsWriteContext(getAuthActorContext("user-2", dbInstance), "web-cms");

  assert.equal(writeContext.actorId, "user-2");
  assert.equal(writeContext.source, "web-cms");
  assert.equal(hasAnyAdminUser(dbInstance), true);
});

test("country moderator assignments resolve into actor context and moderator assignments stay single-country", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values([
    {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
    },
    {
      id: "country-mod-1",
      name: "Country Moderator",
      email: "country-mod@example.com",
    },
    {
      id: "moderator-1",
      name: "Scoped Moderator",
      email: "scoped-moderator@example.com",
    },
  ]).run();

  ensureUserRole("admin-1", "admin", dbInstance);
  ensureUserRole("country-mod-1", "country_moderator", dbInstance);
  ensureUserRole("moderator-1", "moderator", dbInstance);

  const unitedKingdom = dbInstance.db
    .select({ id: countries.id })
    .from(countries)
    .where(eq(countries.slug, "united-kingdom"))
    .get();
  const dorset = dbInstance.db
    .select({ id: regions.id })
    .from(regions)
    .where(eq(regions.slug, "dorset"))
    .get();

  assert.ok(unitedKingdom);
  assert.ok(dorset);

  dbInstance.db.insert(countries).values({
    id: "country-france",
    slug: "france",
    title: "France",
    description: "Second test country.",
    coverImage: "https://example.com/france.jpg",
  }).run();
  dbInstance.db.insert(regions).values({
    id: "region-brittany",
    countryId: "country-france",
    slug: "brittany",
    title: "Brittany",
    description: "Second test region.",
    coverImage: "https://example.com/brittany.jpg",
  }).run();

  setCountryModeratorCountryAssignments("country-mod-1", [unitedKingdom.id], "admin-1", dbInstance);
  const countryModerator = getAuthActorContext("country-mod-1", dbInstance);

  assert.equal(countryModerator.role, "country_moderator");
  assert.equal(countryModerator.countryModeratorCountryAssignments.length, 1);
  assert.equal(countryModerator.countryModeratorCountryAssignments[0]?.countrySlug, "united-kingdom");

  assert.throws(
    () =>
      setModeratorRegionAssignments(
        "moderator-1",
        [dorset.id, "region-brittany"],
        "admin-1",
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "INVALID_INPUT",
  );
});
