import assert from "node:assert/strict";
import test from "node:test";

import { eq } from "drizzle-orm";

import { destinations, moderatorRegionAssignments, regions, user } from "@explorers-map/db";

import {
  createListingForCms,
  createDestinationForCms,
  createCountryForCms,
  createRegionForCms,
  getCountryForCms,
  getRegionForCms,
  getListingForCms,
  getDestinationForCms,
  getAuthActorContext,
  getCmsUserDetail,
  getCountryBySlug,
  getRegionBySlug,
  listCountriesForCms,
  listCmsUsers,
  listListingsForCms,
  listRegionsForCms,
  publishListingForCms,
  restoreListingForCms,
  setModeratorRegionAssignments,
  setUserRole,
  trashListingForCms,
  unpublishListingForCms,
  updateDestinationForCms,
  updateListingForCms,
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

  const detail = getCmsUserDetail("user-1", adminActor, dbInstance);
  assert.equal(detail?.role, "moderator");
  assert.equal(detail?.moderatorRegionAssignments.length, 1);
  assert.equal(detail?.moderatorRegionAssignments[0]?.regionSlug, "dorset");

  const assignmentRow = dbInstance.sqlite
    .prepare("select assigned_by from moderator_region_assignments where user_id = ? and region_id = ?")
    .get("user-1", dorset.id) as { assigned_by: string | null } | undefined;

  assert.equal(assignmentRow?.assigned_by, "admin-1");
  assert.ok(listCmsUsers(adminActor, dbInstance).some((record) => record.userId === "user-1" && record.role === "moderator"));

  updateCmsUserAccess(
    {
      userId: "user-1",
      role: "viewer",
    },
    adminActor,
    dbInstance,
  );

  assert.equal(getCmsUserDetail("user-1", adminActor, dbInstance)?.moderatorRegionAssignments.length, 0);
  assert.equal(
    dbInstance.db.select().from(moderatorRegionAssignments).where(eq(moderatorRegionAssignments.userId, "user-1")).all().length,
    0,
  );
});

test("admins can assign country moderators to one or many countries and country moderators get scoped user listings", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values([
    {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
    },
    {
      id: "country-mod-uk",
      name: "UK Country Moderator",
      email: "country-mod-uk@example.com",
    },
    {
      id: "country-mod-multi",
      name: "Multi Country Moderator",
      email: "country-mod-multi@example.com",
    },
    {
      id: "viewer-1",
      name: "Global Viewer",
      email: "viewer@example.com",
    },
    {
      id: "moderator-uk",
      name: "UK Moderator",
      email: "moderator-uk@example.com",
    },
    {
      id: "moderator-fr",
      name: "France Moderator",
      email: "moderator-fr@example.com",
    },
  ]).run();

  setUserRole("admin-1", "admin", dbInstance);
  setUserRole("country-mod-uk", "viewer", dbInstance);
  setUserRole("country-mod-multi", "viewer", dbInstance);
  setUserRole("viewer-1", "viewer", dbInstance);
  setUserRole("moderator-uk", "viewer", dbInstance);
  setUserRole("moderator-fr", "viewer", dbInstance);

  const adminActor = getAuthActorContext("admin-1", dbInstance);
  const unitedKingdom = dbInstance.sqlite
    .prepare("select id from countries where slug = ?")
    .get("united-kingdom") as { id: string } | undefined;
  const dorset = dbInstance.sqlite
    .prepare("select id from regions where slug = ?")
    .get("dorset") as { id: string } | undefined;

  assert.ok(unitedKingdom);
  assert.ok(dorset);

  const france = createCountryForCms(
    {
      title: "France",
      description: "Atlantic coast and mountain ranges.",
      coverImage: "https://example.com/france.jpg",
    },
    adminActor,
    dbInstance,
  );
  const brittany = createRegionForCms(
    {
      countrySlug: france.slug,
      title: "Brittany",
      description: "France moderation coverage.",
      coverImage: "https://example.com/brittany.jpg",
    },
    adminActor,
    dbInstance,
  );

  updateCmsUserAccess(
    {
      userId: "country-mod-uk",
      role: "country_moderator",
      countryModeratorCountryIds: [unitedKingdom.id],
    },
    adminActor,
    dbInstance,
  );
  updateCmsUserAccess(
    {
      userId: "country-mod-multi",
      role: "country_moderator",
      countryModeratorCountryIds: [unitedKingdom.id, france.id],
    },
    adminActor,
    dbInstance,
  );
  updateCmsUserAccess(
    {
      userId: "moderator-uk",
      role: "moderator",
      moderatorRegionIds: [dorset.id],
    },
    adminActor,
    dbInstance,
  );
  updateCmsUserAccess(
    {
      userId: "moderator-fr",
      role: "moderator",
      moderatorRegionIds: [brittany.id],
    },
    adminActor,
    dbInstance,
  );

  const singleCountryDetail = getCmsUserDetail("country-mod-uk", adminActor, dbInstance);
  const multiCountryDetail = getCmsUserDetail("country-mod-multi", adminActor, dbInstance);

  assert.equal(singleCountryDetail?.role, "country_moderator");
  assert.deepEqual(
    singleCountryDetail?.countryModeratorCountryAssignments.map((assignment) => assignment.countrySlug),
    ["united-kingdom"],
  );
  assert.equal(multiCountryDetail?.role, "country_moderator");
  assert.deepEqual(
    multiCountryDetail?.countryModeratorCountryAssignments.map((assignment) => assignment.countrySlug).sort(),
    ["france", "united-kingdom"],
  );

  const countryModeratorActor = getAuthActorContext("country-mod-uk", dbInstance);
  const manageableUserIds = listCmsUsers(countryModeratorActor, dbInstance).map((record) => record.userId);

  assert.deepEqual(manageableUserIds, ["viewer-1", "moderator-uk"]);
  assert.equal(getCmsUserDetail("viewer-1", countryModeratorActor, dbInstance)?.role, "viewer");
  assert.equal(getCmsUserDetail("moderator-uk", countryModeratorActor, dbInstance)?.role, "moderator");
  assert.throws(
    () => getCmsUserDetail("moderator-fr", countryModeratorActor, dbInstance),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
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

test("country moderators can manage global viewers and in-country moderators but not higher roles or out-of-country assignments", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values([
    {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
    },
    {
      id: "admin-2",
      name: "Second Admin",
      email: "admin-2@example.com",
    },
    {
      id: "country-mod-1",
      name: "Country Moderator",
      email: "country-mod@example.com",
    },
    {
      id: "country-mod-2",
      name: "Second Country Moderator",
      email: "country-mod-2@example.com",
    },
    {
      id: "viewer-global",
      name: "Global Viewer",
      email: "viewer@example.com",
    },
    {
      id: "moderator-uk",
      name: "UK Moderator",
      email: "moderator-uk@example.com",
    },
    {
      id: "moderator-fr",
      name: "France Moderator",
      email: "moderator-fr@example.com",
    },
  ]).run();

  setUserRole("admin-1", "admin", dbInstance);
  setUserRole("admin-2", "admin", dbInstance);
  setUserRole("country-mod-1", "viewer", dbInstance);
  setUserRole("country-mod-2", "viewer", dbInstance);
  setUserRole("viewer-global", "viewer", dbInstance);
  setUserRole("moderator-uk", "viewer", dbInstance);
  setUserRole("moderator-fr", "viewer", dbInstance);

  const adminActor = getAuthActorContext("admin-1", dbInstance);
  const unitedKingdom = dbInstance.sqlite
    .prepare("select id from countries where slug = ?")
    .get("united-kingdom") as { id: string } | undefined;
  const dorset = dbInstance.sqlite
    .prepare("select id from regions where slug = ?")
    .get("dorset") as { id: string } | undefined;
  const devon = dbInstance.sqlite
    .prepare("select id from regions where slug = ?")
    .get("devon") as { id: string } | undefined;

  assert.ok(unitedKingdom);
  assert.ok(dorset);
  assert.ok(devon);

  const france = createCountryForCms(
    {
      title: "France",
      description: "Country moderator boundary coverage.",
      coverImage: "https://example.com/france.jpg",
    },
    adminActor,
    dbInstance,
  );
  const brittany = createRegionForCms(
    {
      countrySlug: france.slug,
      title: "Brittany",
      description: "Out-of-scope moderator assignment coverage.",
      coverImage: "https://example.com/brittany.jpg",
    },
    adminActor,
    dbInstance,
  );

  updateCmsUserAccess(
    {
      userId: "country-mod-1",
      role: "country_moderator",
      countryModeratorCountryIds: [unitedKingdom.id],
    },
    adminActor,
    dbInstance,
  );
  updateCmsUserAccess(
    {
      userId: "country-mod-2",
      role: "country_moderator",
      countryModeratorCountryIds: [france.id],
    },
    adminActor,
    dbInstance,
  );
  updateCmsUserAccess(
    {
      userId: "moderator-uk",
      role: "moderator",
      moderatorRegionIds: [dorset.id],
    },
    adminActor,
    dbInstance,
  );
  updateCmsUserAccess(
    {
      userId: "moderator-fr",
      role: "moderator",
      moderatorRegionIds: [brittany.id],
    },
    adminActor,
    dbInstance,
  );

  const countryModeratorActor = getAuthActorContext("country-mod-1", dbInstance);

  const promotedViewer = updateCmsUserAccess(
    {
      userId: "viewer-global",
      role: "moderator",
      moderatorRegionIds: [devon.id],
    },
    countryModeratorActor,
    dbInstance,
  );

  assert.equal(promotedViewer.role, "moderator");
  assert.deepEqual(
    getCmsUserDetail("viewer-global", adminActor, dbInstance)?.moderatorRegionAssignments.map((assignment) => assignment.regionSlug),
    ["devon"],
  );

  const updatedModerator = updateCmsUserAccess(
    {
      userId: "moderator-uk",
      role: "moderator",
      moderatorRegionIds: [devon.id],
    },
    countryModeratorActor,
    dbInstance,
  );

  assert.equal(updatedModerator.role, "moderator");
  assert.deepEqual(
    getCmsUserDetail("moderator-uk", adminActor, dbInstance)?.moderatorRegionAssignments.map((assignment) => assignment.regionSlug),
    ["devon"],
  );

  const demotedViewer = updateCmsUserAccess(
    {
      userId: "viewer-global",
      role: "viewer",
    },
    countryModeratorActor,
    dbInstance,
  );

  assert.equal(demotedViewer.role, "viewer");
  assert.equal(getCmsUserDetail("viewer-global", adminActor, dbInstance)?.moderatorRegionAssignments.length, 0);

  assert.throws(
    () =>
      updateCmsUserAccess(
        {
          userId: "viewer-global",
          role: "moderator",
          moderatorRegionIds: [brittany.id],
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () =>
      updateCmsUserAccess(
        {
          userId: "moderator-fr",
          role: "viewer",
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () =>
      updateCmsUserAccess(
        {
          userId: "admin-2",
          role: "viewer",
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () =>
      updateCmsUserAccess(
        {
          userId: "country-mod-2",
          role: "viewer",
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () =>
      updateCmsUserAccess(
        {
          userId: "viewer-global",
          role: "admin",
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () =>
      updateCmsUserAccess(
        {
          userId: "viewer-global",
          role: "country_moderator",
          countryModeratorCountryIds: [unitedKingdom.id],
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
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

test("country moderators can edit assigned countries and fully manage regions, destinations, and listings inside those countries", (t) => {
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
  ]).run();

  setUserRole("admin-1", "admin", dbInstance);
  setUserRole("country-mod-1", "viewer", dbInstance);

  const adminActor = getAuthActorContext("admin-1", dbInstance);
  const unitedKingdom = dbInstance.sqlite
    .prepare("select id from countries where slug = ?")
    .get("united-kingdom") as { id: string } | undefined;
  const dorset = dbInstance.sqlite
    .prepare("select id from regions where slug = ?")
    .get("dorset") as { id: string } | undefined;
  const devon = dbInstance.sqlite
    .prepare("select id from regions where slug = ?")
    .get("devon") as { id: string } | undefined;

  assert.ok(unitedKingdom);
  assert.ok(dorset);
  assert.ok(devon);

  const france = createCountryForCms(
    {
      title: "France",
      description: "Country-scope coverage.",
      coverImage: "https://example.com/france.jpg",
    },
    adminActor,
    dbInstance,
  );
  const brittany = createRegionForCms(
    {
      countrySlug: france.slug,
      title: "Brittany",
      description: "France region coverage.",
      coverImage: "https://example.com/brittany.jpg",
    },
    adminActor,
    dbInstance,
  );

  updateCmsUserAccess(
    {
      userId: "country-mod-1",
      role: "country_moderator",
      countryModeratorCountryIds: [unitedKingdom.id],
    },
    adminActor,
    dbInstance,
  );

  const countryModeratorActor = getAuthActorContext("country-mod-1", dbInstance);

  assert.deepEqual(listCountriesForCms(countryModeratorActor, dbInstance).map((country) => country.slug), ["united-kingdom"]);
  assert.ok(listRegionsForCms(countryModeratorActor, dbInstance).every((region) => region.countrySlug === "united-kingdom"));
  assert.equal(getCountryForCms("united-kingdom", countryModeratorActor, dbInstance)?.slug, "united-kingdom");
  assert.throws(
    () => getCountryForCms(france.slug, countryModeratorActor, dbInstance),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );

  const updatedCountry = updateCountryForCms(
    {
      currentSlug: "united-kingdom",
      title: "United Kingdom Coast",
      slug: "united-kingdom",
      description: "Updated assigned country metadata.",
      coverImage: "https://example.com/united-kingdom-coast.jpg",
    },
    countryModeratorActor,
    dbInstance,
  );

  assert.equal(updatedCountry.title, "United Kingdom Coast");
  assert.throws(
    () =>
      updateCountryForCms(
        {
          currentSlug: france.slug,
          title: "France Atlantic",
          slug: france.slug,
          description: "Attempted out-of-scope update.",
          coverImage: "https://example.com/france-atlantic.jpg",
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );

  const createdRegion = createRegionForCms(
    {
      countrySlug: "united-kingdom",
      title: "South Downs",
      description: "Created by a country moderator.",
      coverImage: "https://example.com/south-downs.jpg",
    },
    countryModeratorActor,
    dbInstance,
  );

  assert.equal(createdRegion.countrySlug, "united-kingdom");
  assert.throws(
    () =>
      createRegionForCms(
        {
          countrySlug: france.slug,
          title: "Normandy Coast",
          description: "Should be blocked.",
          coverImage: "https://example.com/normandy-coast.jpg",
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () => getRegionForCms(france.slug, brittany.slug, countryModeratorActor, dbInstance),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );

  const dorsetDestination = createDestinationForCms(
    {
      countrySlug: "united-kingdom",
      title: "Pebble Harbours",
      description: "Initial in-country destination.",
      coverImage: "https://example.com/pebble-harbours.jpg",
      regionIds: [dorset.id],
    },
    countryModeratorActor,
    dbInstance,
  );
  const updatedDestination = updateDestinationForCms(
    {
      currentCountrySlug: "united-kingdom",
      currentDestinationSlug: dorsetDestination.slug,
      countrySlug: "united-kingdom",
      title: "Pebble Harbours West",
      slug: "pebble-harbours-west",
      description: "Country moderators replace destination regions within their countries.",
      coverImage: "https://example.com/pebble-harbours-west.jpg",
      regionIds: [devon.id],
    },
    countryModeratorActor,
    dbInstance,
  );

  assert.deepEqual(updatedDestination.regions.map((region) => region.regionSlug), ["devon"]);

  const franceDestination = createDestinationForCms(
    {
      countrySlug: france.slug,
      title: "Brittany Coast",
      description: "Admin-created out-of-scope destination.",
      coverImage: "https://example.com/brittany-coast.jpg",
      regionIds: [brittany.id],
    },
    adminActor,
    dbInstance,
  );

  assert.throws(
    () =>
      createDestinationForCms(
        {
          countrySlug: france.slug,
          title: "Blocked France Destination",
          description: "Should be blocked for the country moderator.",
          coverImage: "https://example.com/blocked-france-destination.jpg",
          regionIds: [brittany.id],
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
  assert.throws(
    () => getDestinationForCms(france.slug, franceDestination.slug, countryModeratorActor, dbInstance),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );

  const replacementDestination = createDestinationForCms(
    {
      countrySlug: "united-kingdom",
      title: "Jurassic Harbours",
      description: "Replacement destination for listing edits.",
      coverImage: "https://example.com/jurassic-harbours.jpg",
      regionIds: [dorset.id],
    },
    countryModeratorActor,
    dbInstance,
  );

  const createdListing = createListingForCms(
    {
      regionId: dorset.id,
      title: "Cliff Path",
      shortDescription: "Country moderator listing create.",
      description: "Created inside an assigned country.",
      coverImage: "https://example.com/cliff-path.jpg",
      categorySlug: "beach",
      busynessRating: 2,
      latitude: 50.61,
      longitude: -2.45,
      destinationIds: [replacementDestination.id],
    },
    countryModeratorActor,
    dbInstance,
  );
  const updatedListing = updateListingForCms(
    {
      currentCountrySlug: createdListing.countrySlug,
      currentRegionSlug: createdListing.regionSlug,
      currentListingSlug: createdListing.slug,
      title: "Cliff Path Viewpoint",
      shortDescription: "Country moderator listing update.",
      description: "Destination replacement should be full-country scoped.",
      coverImage: "https://example.com/cliff-path-viewpoint.jpg",
      categorySlug: "beach",
      busynessRating: 3,
      latitude: 50.62,
      longitude: -2.44,
      destinationIds: [updatedDestination.id],
    },
    countryModeratorActor,
    dbInstance,
  );

  assert.deepEqual(updatedListing.destinations.map((destination) => destination.destinationSlug), [updatedDestination.slug]);

  const publishedListing = publishListingForCms(
    {
      countrySlug: updatedListing.countrySlug,
      regionSlug: updatedListing.regionSlug,
      listingSlug: updatedListing.slug,
    },
    countryModeratorActor,
    dbInstance,
  );
  assert.equal(publishedListing.status, "published");

  const unpublishedListing = unpublishListingForCms(
    {
      countrySlug: updatedListing.countrySlug,
      regionSlug: updatedListing.regionSlug,
      listingSlug: updatedListing.slug,
    },
    countryModeratorActor,
    dbInstance,
  );
  assert.equal(unpublishedListing.status, "draft");

  const trashedListing = trashListingForCms(
    {
      countrySlug: updatedListing.countrySlug,
      regionSlug: updatedListing.regionSlug,
      listingSlug: updatedListing.slug,
    },
    countryModeratorActor,
    dbInstance,
  );
  assert.ok(trashedListing.deletedAt);

  const restoredListing = restoreListingForCms(
    {
      countrySlug: updatedListing.countrySlug,
      regionSlug: updatedListing.regionSlug,
      listingSlug: updatedListing.slug,
    },
    countryModeratorActor,
    dbInstance,
  );
  assert.equal(restoredListing.deletedAt, null);

  assert.throws(
    () =>
      createListingForCms(
        {
          regionId: brittany.id,
          title: "Blocked France Listing",
          shortDescription: "Should fail.",
          description: "Out-of-country listing creation should fail.",
          coverImage: "https://example.com/blocked-france-listing.jpg",
          categorySlug: "beach",
          busynessRating: 2,
          latitude: 48.1,
          longitude: -3.2,
          destinationIds: [],
        },
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );

  const franceListing = createListingForCms(
    {
      regionId: brittany.id,
      title: "Brittany Watchpoint",
      shortDescription: "Admin-created France listing.",
      description: "Out-of-scope listing visibility coverage.",
      coverImage: "https://example.com/brittany-watchpoint.jpg",
      categorySlug: "beach",
      busynessRating: 2,
      latitude: 48.2,
      longitude: -3.4,
      destinationIds: [franceDestination.id],
    },
    adminActor,
    dbInstance,
  );

  assert.ok(listListingsForCms(countryModeratorActor, dbInstance).some((listing) => listing.slug === updatedListing.slug));
  assert.ok(!listListingsForCms(countryModeratorActor, dbInstance).some((listing) => listing.slug === franceListing.slug));
  assert.throws(
    () =>
      getListingForCms(
        franceListing.countrySlug,
        franceListing.regionSlug,
        franceListing.slug,
        countryModeratorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
});

test("admin destination CMS writes stamp audit attribution and support slug updates", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();

  setUserRole("admin-1", "admin", dbInstance);
  const adminActor = getAuthActorContext("admin-1", dbInstance);
  const dorset = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "dorset")).get();
  const devon = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "devon")).get();

  assert.ok(dorset);
  assert.ok(devon);

  const created = createDestinationForCms(
    {
      countrySlug: "united-kingdom",
      title: "Devon Cliffs",
      description: "A destination for testing audit attribution.",
      coverImage: "https://example.com/devon-cliffs.jpg",
      regionIds: [dorset.id],
    },
    adminActor,
    dbInstance,
  );

  assert.equal(created.slug, "devon-cliffs");
  assert.deepEqual(created.regions.map((region) => region.regionSlug), ["dorset"]);

  const createdRow = dbInstance.db
    .select({
      createdBy: destinations.createdBy,
      updatedBy: destinations.updatedBy,
    })
    .from(destinations)
    .where(eq(destinations.id, created.id))
    .get();

  assert.equal(createdRow?.createdBy, "admin-1");
  assert.equal(createdRow?.updatedBy, "admin-1");

  const updated = updateDestinationForCms(
    {
      currentCountrySlug: "united-kingdom",
      currentDestinationSlug: "devon-cliffs",
      countrySlug: "united-kingdom",
      title: "Devon Sea Cliffs",
      slug: "devon-sea-cliffs",
      description: "Updated destination slug and regions.",
      coverImage: "https://example.com/devon-sea-cliffs.jpg",
      regionIds: [dorset.id, devon.id],
    },
    adminActor,
    dbInstance,
  );

  assert.equal(updated.slug, "devon-sea-cliffs");
  assert.equal(getDestinationForCms("united-kingdom", "devon-cliffs", adminActor, dbInstance), null);
  assert.deepEqual(
    updated.regions.map((region) => region.regionSlug),
    ["devon", "dorset"],
  );

  const updatedRow = dbInstance.db
    .select({
      updatedBy: destinations.updatedBy,
    })
    .from(destinations)
    .where(eq(destinations.id, updated.id))
    .get();

  assert.equal(updatedRow?.updatedBy, "admin-1");
});

test("moderators can create destinations only inside managed regions", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values([
    {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
    },
    {
      id: "moderator-1",
      name: "Moderator User",
      email: "moderator@example.com",
    },
  ]).run();

  setUserRole("moderator-1", "moderator", dbInstance);

  const dorset = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "dorset")).get();
  const devon = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "devon")).get();

  assert.ok(dorset);
  assert.ok(devon);

  setModeratorRegionAssignments("moderator-1", [dorset.id], "admin-1", dbInstance);
  const moderatorActor = getAuthActorContext("moderator-1", dbInstance);

  const created = createDestinationForCms(
    {
      countrySlug: "united-kingdom",
      title: "Dorset Coves",
      description: "Moderator-created destination.",
      coverImage: "https://example.com/dorset-coves.jpg",
      regionIds: [dorset.id],
    },
    moderatorActor,
    dbInstance,
  );

  assert.equal(created.slug, "dorset-coves");

  assert.throws(
    () =>
      createDestinationForCms(
        {
          countrySlug: "united-kingdom",
          title: "Devon Rivers",
          description: "Attempt to create outside the moderator scope.",
          coverImage: "https://example.com/devon-rivers.jpg",
          regionIds: [devon.id],
        },
        moderatorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
});

test("moderator destination edits preserve unmanaged links, allow managed expansion, and reject overlap loss", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values([
    {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
    },
    {
      id: "moderator-1",
      name: "Moderator User",
      email: "moderator@example.com",
    },
  ]).run();

  setUserRole("admin-1", "admin", dbInstance);
  setUserRole("moderator-1", "moderator", dbInstance);

  const adminActor = getAuthActorContext("admin-1", dbInstance);
  const dorset = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "dorset")).get();
  const devon = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "devon")).get();

  assert.ok(dorset);
  assert.ok(devon);

  const created = createDestinationForCms(
    {
      countrySlug: "united-kingdom",
      title: "South Coast Escapes",
      description: "Shared destination for moderator tests.",
      coverImage: "https://example.com/south-coast-escapes.jpg",
      regionIds: [dorset.id, devon.id],
    },
    adminActor,
    dbInstance,
  );

  setModeratorRegionAssignments("moderator-1", [dorset.id], "admin-1", dbInstance);
  const moderatorActor = getAuthActorContext("moderator-1", dbInstance);

  const preserved = updateDestinationForCms(
    {
      currentCountrySlug: "united-kingdom",
      currentDestinationSlug: created.slug,
      countrySlug: "united-kingdom",
      title: "South Coast Escapes Updated",
      description: "Moderator update that should preserve unmanaged regions.",
      coverImage: "https://example.com/south-coast-escapes-updated.jpg",
      regionIds: [dorset.id],
    },
    moderatorActor,
    dbInstance,
  );

  assert.deepEqual(
    preserved.regions.map((region) => region.regionSlug),
    ["devon", "dorset"],
  );

  assert.throws(
    () =>
      updateDestinationForCms(
        {
          currentCountrySlug: "united-kingdom",
          currentDestinationSlug: preserved.slug,
          countrySlug: "united-kingdom",
          title: "South Coast Escapes Updated",
          description: "Attempt to drop overlap entirely.",
          coverImage: "https://example.com/south-coast-escapes-updated.jpg",
          regionIds: [],
        },
        moderatorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );

  setModeratorRegionAssignments("moderator-1", [dorset.id, devon.id], "admin-1", dbInstance);
  const expandedActor = getAuthActorContext("moderator-1", dbInstance);
  const expanded = updateDestinationForCms(
    {
      currentCountrySlug: "united-kingdom",
      currentDestinationSlug: preserved.slug,
      countrySlug: "united-kingdom",
      title: "South Coast Escapes Expanded",
      description: "Moderator can expand into another managed region.",
      coverImage: "https://example.com/south-coast-escapes-expanded.jpg",
      regionIds: [dorset.id, devon.id],
    },
    expandedActor,
    dbInstance,
  );

  assert.deepEqual(
    expanded.regions.map((region) => region.regionSlug),
    ["devon", "dorset"],
  );

  assert.throws(
    () =>
      updateDestinationForCms(
        {
          currentCountrySlug: "united-kingdom",
          currentDestinationSlug: expanded.slug,
          countrySlug: "united-kingdom",
          title: "South Coast Escapes Conflict",
          slug: "jurassic-coast",
          description: "Attempt to collide with an existing destination slug.",
          coverImage: "https://example.com/south-coast-escapes-conflict.jpg",
          regionIds: [dorset.id, devon.id],
        },
        expandedActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "CONFLICT",
  );
});

test("listing CMS services enforce moderator region scope and preserve out-of-scope destination links", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values([
    {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
    },
    {
      id: "moderator-1",
      name: "Moderator User",
      email: "moderator@example.com",
    },
  ]).run();

  setUserRole("admin-1", "admin", dbInstance);
  setUserRole("moderator-1", "moderator", dbInstance);

  const adminActor = getAuthActorContext("admin-1", dbInstance);
  const moderatorActor = getAuthActorContext("moderator-1", dbInstance);
  const dorset = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "dorset")).get();
  const devon = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "devon")).get();
  const jurassicCoast = dbInstance.db
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.slug, "jurassic-coast"))
    .get();
  const peakDistrict = dbInstance.db
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.slug, "peak-district-national-park"))
    .get();

  assert.ok(dorset);
  assert.ok(devon);
  assert.ok(jurassicCoast);
  assert.ok(peakDistrict);

  setModeratorRegionAssignments("moderator-1", [dorset.id], "admin-1", dbInstance);
  const scopedModerator = getAuthActorContext("moderator-1", dbInstance);

  const created = createListingForCms(
    {
      regionId: dorset.id,
      title: "Scope Test Cove",
      shortDescription: "Moderator-safe create flow.",
      description: "Created inside an assigned region.",
      coverImage: "https://example.com/scope-test-cove.jpg",
      categorySlug: "beach",
      busynessRating: 2,
      latitude: 50.61,
      longitude: -2.45,
      destinationIds: [peakDistrict.id],
    },
    adminActor,
    dbInstance,
  );
  const moderatorView = getListingForCms(created.countrySlug, created.regionSlug, created.slug, scopedModerator, dbInstance);

  assert.equal(created.regionSlug, "dorset");
  assert.deepEqual(moderatorView?.destinations.map((destination) => destination.destinationSlug), ["peak-district-national-park"]);
  assert.equal(moderatorView?.destinations[0]?.manageableByActor, false);

  const updatedByModerator = updateListingForCms(
    {
      currentCountrySlug: created.countrySlug,
      currentRegionSlug: created.regionSlug,
      currentListingSlug: created.slug,
      title: "Scope Test Cove Updated",
      shortDescription: "Moderator updated the copy.",
      description: "Moderator edit should preserve admin-only destinations.",
      coverImage: "https://example.com/scope-test-cove-updated.jpg",
      categorySlug: "beach",
      busynessRating: 3,
      latitude: 50.62,
      longitude: -2.44,
      destinationIds: [jurassicCoast.id],
    },
    scopedModerator,
    dbInstance,
  );

  assert.equal(updatedByModerator.slug, "scope-test-cove-updated");
  assert.deepEqual(
    updatedByModerator.destinations.map((destination) => destination.destinationSlug),
    ["jurassic-coast", "peak-district-national-park"],
  );
  assert.equal(updatedByModerator.destinations.find((destination) => destination.destinationSlug === "jurassic-coast")?.manageableByActor, true);
  assert.equal(
    updatedByModerator.destinations.find((destination) => destination.destinationSlug === "peak-district-national-park")?.manageableByActor,
    false,
  );

  assert.throws(
    () =>
      createListingForCms(
        {
          regionId: devon.id,
          title: "Out Of Scope Cove",
          shortDescription: "Should fail.",
          description: "Moderators cannot create outside assigned regions.",
          coverImage: "https://example.com/out-of-scope-cove.jpg",
          categorySlug: "beach",
          busynessRating: 2,
          latitude: 50.72,
          longitude: -3.11,
          destinationIds: [],
        },
        scopedModerator,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );

  const devonListing = createListingForCms(
    {
      regionId: devon.id,
      title: "Admin Devon Listing",
      shortDescription: "Admin-only region coverage.",
      description: "Admin created listing in another moderator-inaccessible region.",
      coverImage: "https://example.com/admin-devon-listing.jpg",
      categorySlug: "beach",
      busynessRating: 2,
      latitude: 50.7,
      longitude: -3.2,
      destinationIds: [jurassicCoast.id],
    },
    adminActor,
    dbInstance,
  );

  assert.throws(
    () => getListingForCms(devonListing.countrySlug, devonListing.regionSlug, devonListing.slug, scopedModerator, dbInstance),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
  assert.ok(!listListingsForCms(scopedModerator, dbInstance).some((listing) => listing.slug === devonListing.slug));

  assert.throws(
    () =>
      updateListingForCms(
        {
          currentCountrySlug: devonListing.countrySlug,
          currentRegionSlug: devonListing.regionSlug,
          currentListingSlug: devonListing.slug,
          title: "Blocked Devon Listing",
          shortDescription: "Blocked edit.",
          description: "Blocked edit.",
          coverImage: "https://example.com/blocked-devon-listing.jpg",
          categorySlug: "beach",
          busynessRating: 2,
          latitude: 50.7,
          longitude: -3.2,
          destinationIds: [jurassicCoast.id],
        },
        scopedModerator,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "FORBIDDEN",
  );
});

test("listing CMS lifecycle actions work inside assigned regions", (t) => {
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values([
    {
      id: "admin-1",
      name: "Admin User",
      email: "admin@example.com",
    },
    {
      id: "moderator-1",
      name: "Moderator User",
      email: "moderator@example.com",
    },
  ]).run();

  setUserRole("admin-1", "admin", dbInstance);
  setUserRole("moderator-1", "moderator", dbInstance);

  const dorset = dbInstance.db.select({ id: regions.id }).from(regions).where(eq(regions.slug, "dorset")).get();
  assert.ok(dorset);

  setModeratorRegionAssignments("moderator-1", [dorset.id], "admin-1", dbInstance);
  const moderatorActor = getAuthActorContext("moderator-1", dbInstance);

  const created = createListingForCms(
    {
      regionId: dorset.id,
      title: "Lifecycle Jetty",
      shortDescription: "Lifecycle draft.",
      description: "Lifecycle draft description.",
      coverImage: "https://example.com/lifecycle-jetty.jpg",
      categorySlug: "beach",
      busynessRating: 1,
      latitude: 50.63,
      longitude: -2.41,
      destinationIds: [],
    },
    moderatorActor,
    dbInstance,
  );

  assert.equal(created.status, "draft");

  const published = publishListingForCms(
    {
      countrySlug: created.countrySlug,
      regionSlug: created.regionSlug,
      listingSlug: created.slug,
    },
    moderatorActor,
    dbInstance,
  );
  assert.equal(published.status, "published");
  assert.equal(published.updatedBy, "moderator-1");

  const unpublished = unpublishListingForCms(
    {
      countrySlug: created.countrySlug,
      regionSlug: created.regionSlug,
      listingSlug: created.slug,
    },
    moderatorActor,
    dbInstance,
  );
  assert.equal(unpublished.status, "draft");

  const trashed = trashListingForCms(
    {
      countrySlug: created.countrySlug,
      regionSlug: created.regionSlug,
      listingSlug: created.slug,
    },
    moderatorActor,
    dbInstance,
  );
  assert.ok(trashed.deletedAt);

  assert.throws(
    () =>
      updateListingForCms(
        {
          currentCountrySlug: created.countrySlug,
          currentRegionSlug: created.regionSlug,
          currentListingSlug: created.slug,
          title: "Lifecycle Jetty Updated",
          shortDescription: "Should be blocked while trashed.",
          description: "Should be blocked while trashed.",
          coverImage: "https://example.com/lifecycle-jetty-updated.jpg",
          categorySlug: "beach",
          busynessRating: 2,
          latitude: 50.63,
          longitude: -2.41,
          destinationIds: [],
        },
        moderatorActor,
        dbInstance,
      ),
    (error) => error instanceof ServiceError && error.code === "INVALID_STATE",
  );

  const restored = restoreListingForCms(
    {
      countrySlug: created.countrySlug,
      regionSlug: created.regionSlug,
      listingSlug: created.slug,
    },
    moderatorActor,
    dbInstance,
  );

  assert.equal(restored.deletedAt, null);
});
