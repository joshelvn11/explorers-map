import assert from "node:assert/strict";
import test from "node:test";

import { getURLFromRedirectError } from "next/dist/client/components/redirect.js";
import { isRedirectError } from "next/dist/client/components/redirect-error.js";

import { regions, user } from "@explorers-map/db";
import {
  createCountryForCms,
  createDestinationForCms,
  createListingForCms,
  getAuthActorContext,
  setCountryModeratorCountryAssignments,
  setModeratorRegionAssignments,
  setUserRole,
} from "@explorers-map/services";

import {
  createCmsCountry,
  createCmsRegion,
  createCmsUser,
  getCmsActionErrorMessage,
  updateCmsCountry,
  updateCmsRegion,
} from "./lib/cms-admin.ts";
import { createAuth } from "./lib/auth.ts";
import { getCmsUserRoleOptions } from "./lib/cms-user-form-options.ts";
import {
  createCmsDestination,
  getCmsActionErrorMessage as getCmsDestinationActionErrorMessage,
  resolveCmsDestinationAccess,
  updateCmsDestination,
} from "./lib/cms-destinations.ts";
import {
  createCmsListing,
  getCmsActionErrorMessage as getCmsListingActionErrorMessage,
  publishCmsListing,
  resolveCmsListingAccess,
  trashCmsListing,
  updateCmsListing,
} from "./lib/cms-listings.ts";
import { requireAdminActorFromHeaders, requireCountryModeratorActorFromHeaders } from "./lib/session.ts";
import { createSeededTestDb } from "../../packages/services/test-helpers.ts";

const baseUrl = "http://localhost:3000";

function buildAuthRequest(
  path: string,
  init: RequestInit = {},
  cookieHeader?: string,
) {
  return new Request(`${baseUrl}${path}`, {
    ...init,
    headers: {
      origin: baseUrl,
      "x-forwarded-for": "127.0.0.1",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function toCookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
}

function withAuthEnv(t: { after: (fn: () => void) => void }) {
  const originalUrl = process.env.BETTER_AUTH_URL;
  const originalSecret = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_URL = baseUrl;
  process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-value-1234567890";
  t.after(() => {
    process.env.BETTER_AUTH_URL = originalUrl;
    process.env.BETTER_AUTH_SECRET = originalSecret;
  });
}

test("admin-created CMS users persist and duplicate emails are rejected", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();
  setUserRole("admin-1", "admin", dbInstance);

  const dorset = dbInstance.sqlite.prepare("select id from regions where slug = ?").get("dorset") as { id: string } | undefined;
  assert.ok(dorset);

  const result = await createCmsUser(
    {
      name: "New Moderator",
      email: "new-moderator@example.com",
      password: "password123",
      role: "moderator",
      moderatorRegionIds: [dorset.id],
    },
    getAuthActorContext("admin-1", dbInstance),
    dbInstance,
  );
  const createdUser = dbInstance.sqlite
    .prepare("select id from user where email = ?")
    .get("new-moderator@example.com") as { id: string };

  assert.equal(result.redirectTo.startsWith("/cms/users/"), true);
  assert.equal(getAuthActorContext(createdUser.id, dbInstance).role, "moderator");

  await assert.rejects(
    () =>
      createCmsUser(
        {
          name: "Duplicate",
          email: "new-moderator@example.com",
          password: "password123",
          role: "viewer",
        },
        getAuthActorContext("admin-1", dbInstance),
        dbInstance,
      ),
    /already exists/i,
  );

  const errorMessage = getCmsActionErrorMessage(new Error("Custom failure"));
  assert.equal(errorMessage, "Custom failure");
});

test("moderators are redirected away from admin-only CMS routes while admins pass", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);
  const auth = createAuth({ dbInstance, enableNextCookies: false });

  const moderatorResponse = await auth.handler(
    buildAuthRequest("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: "Moderator User",
        email: "moderator@example.com",
        password: "password123",
      }),
    }),
  );
  const moderatorCookie = toCookieHeader(moderatorResponse);
  const moderatorId = (dbInstance.sqlite
    .prepare("select id from user where email = ?")
    .get("moderator@example.com") as { id: string }).id;
  setUserRole(moderatorId, "moderator", dbInstance);

  await assert.rejects(
    () => requireAdminActorFromHeaders(new Headers({ cookie: moderatorCookie }), "/cms/users", auth, dbInstance),
    (error) => isRedirectError(error) && getURLFromRedirectError(error) === "/cms",
  );

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();
  setUserRole("admin-1", "admin", dbInstance);

  const adminResponse = await auth.handler(
    buildAuthRequest("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: "Real Admin",
        email: "real-admin@example.com",
        password: "password123",
      }),
    }),
  );
  const adminCookie = toCookieHeader(adminResponse);
  const adminId = (dbInstance.sqlite
    .prepare("select id from user where email = ?")
    .get("real-admin@example.com") as { id: string }).id;
  setUserRole(adminId, "admin", dbInstance);

  const actor = await requireAdminActorFromHeaders(new Headers({ cookie: adminCookie }), "/cms/users", auth, dbInstance);
  assert.equal(actor.role, "admin");
});

test("country moderators pass shared CMS guards but are redirected away from admin-only routes", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);
  const auth = createAuth({ dbInstance, enableNextCookies: false });

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();
  setUserRole("admin-1", "admin", dbInstance);

  const response = await auth.handler(
    buildAuthRequest("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: "Country Moderator",
        email: "country-moderator@example.com",
        password: "password123",
      }),
    }),
  );
  const cookie = toCookieHeader(response);
  const countryModeratorId = (dbInstance.sqlite
    .prepare("select id from user where email = ?")
    .get("country-moderator@example.com") as { id: string }).id;
  const unitedKingdom = dbInstance.sqlite
    .prepare("select id from countries where slug = ?")
    .get("united-kingdom") as { id: string } | undefined;

  assert.ok(unitedKingdom);

  setUserRole(countryModeratorId, "country_moderator", dbInstance);
  setCountryModeratorCountryAssignments(countryModeratorId, [unitedKingdom.id], "admin-1", dbInstance);

  const actor = await requireCountryModeratorActorFromHeaders(
    new Headers({ cookie }),
    "/cms/users",
    auth,
    dbInstance,
  );

  assert.equal(actor.role, "country_moderator");
  assert.deepEqual(actor.countryModeratorCountryAssignments.map((assignment) => assignment.countrySlug), ["united-kingdom"]);

  await assert.rejects(
    () => requireAdminActorFromHeaders(new Headers({ cookie }), "/cms/countries/new", auth, dbInstance),
    (error) => isRedirectError(error) && getURLFromRedirectError(error) === "/cms",
  );
});

test("country moderators can create viewers and moderators but not higher roles, and the user form only exposes allowed roles", async (t) => {
  withAuthEnv(t);
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
  setUserRole("country-mod-1", "country_moderator", dbInstance);

  const unitedKingdom = dbInstance.sqlite
    .prepare("select id from countries where slug = ?")
    .get("united-kingdom") as { id: string } | undefined;
  const dorset = dbInstance.sqlite.prepare("select id from regions where slug = ?").get("dorset") as { id: string } | undefined;

  assert.ok(unitedKingdom);
  assert.ok(dorset);

  setCountryModeratorCountryAssignments("country-mod-1", [unitedKingdom.id], "admin-1", dbInstance);

  const actor = getAuthActorContext("country-mod-1", dbInstance);

  const createdViewer = await createCmsUser(
    {
      name: "Scoped Viewer",
      email: "scoped-viewer@example.com",
      password: "password123",
      role: "viewer",
    },
    actor,
    dbInstance,
  );
  const createdModerator = await createCmsUser(
    {
      name: "Scoped Moderator",
      email: "scoped-moderator@example.com",
      password: "password123",
      role: "moderator",
      moderatorRegionIds: [dorset.id],
    },
    actor,
    dbInstance,
  );

  assert.equal(createdViewer.redirectTo.startsWith("/cms/users/"), true);
  assert.equal(createdModerator.redirectTo.startsWith("/cms/users/"), true);

  const viewerId = (dbInstance.sqlite
    .prepare("select id from user where email = ?")
    .get("scoped-viewer@example.com") as { id: string }).id;
  const moderatorId = (dbInstance.sqlite
    .prepare("select id from user where email = ?")
    .get("scoped-moderator@example.com") as { id: string }).id;

  assert.equal(getAuthActorContext(viewerId, dbInstance).role, "viewer");
  assert.equal(getAuthActorContext(moderatorId, dbInstance).role, "moderator");

  await assert.rejects(
    () =>
      createCmsUser(
        {
          name: "Blocked Admin",
          email: "blocked-admin@example.com",
          password: "password123",
          role: "admin",
        },
        actor,
        dbInstance,
      ),
    /Only admins can create admin and country moderator users/i,
  );
  await assert.rejects(
    () =>
      createCmsUser(
        {
          name: "Blocked Country Moderator",
          email: "blocked-country-moderator@example.com",
          password: "password123",
          role: "country_moderator",
          countryModeratorCountryIds: [unitedKingdom.id],
        },
        actor,
        dbInstance,
      ),
    /Only admins can create admin and country moderator users/i,
  );

  assert.deepEqual(getCmsUserRoleOptions("admin").map((option) => option.value), [
    "viewer",
    "moderator",
    "country_moderator",
    "admin",
  ]);
  assert.deepEqual(getCmsUserRoleOptions("country_moderator").map((option) => option.value), [
    "viewer",
    "moderator",
  ]);
});

test("CMS admin helpers redirect to the new slugged routes after country and region edits", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();
  setUserRole("admin-1", "admin", dbInstance);
  const actor = getAuthActorContext("admin-1", dbInstance);

  const createdCountry = await createCmsCountry(
    {
      title: "France",
      description: "Initial country record.",
      coverImage: "https://example.com/france.jpg",
    },
    actor,
    dbInstance,
  );
  assert.equal(createdCountry.redirectTo, "/cms/countries/france");

  const updatedCountry = await updateCmsCountry(
    {
      currentSlug: "france",
      title: "France West",
      slug: "france-west",
      description: "Updated country record.",
      coverImage: "https://example.com/france-west.jpg",
    },
    actor,
    dbInstance,
  );
  assert.equal(updatedCountry.redirectTo, "/cms/countries/france-west");

  const createdRegion = await createCmsRegion(
    {
      countrySlug: "france-west",
      title: "North Coast",
      description: "Initial region record.",
      coverImage: "https://example.com/north-coast.jpg",
    },
    actor,
    dbInstance,
  );
  assert.equal(createdRegion.redirectTo, "/cms/regions/france-west/north-coast");

  const updatedRegion = await updateCmsRegion(
    {
      currentCountrySlug: "france-west",
      currentRegionSlug: "north-coast",
      countrySlug: "france-west",
      title: "Northern Dunes",
      slug: "northern-dunes",
      description: "Updated region record.",
      coverImage: "https://example.com/northern-dunes.jpg",
    },
    actor,
    dbInstance,
  );
  assert.equal(updatedRegion.redirectTo, "/cms/regions/france-west/northern-dunes");
});

test("country moderators can use shared country and region helpers only inside assigned countries", async (t) => {
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
  setUserRole("country-mod-1", "country_moderator", dbInstance);

  const adminActor = getAuthActorContext("admin-1", dbInstance);
  const unitedKingdom = dbInstance.sqlite
    .prepare("select id from countries where slug = ?")
    .get("united-kingdom") as { id: string } | undefined;

  assert.ok(unitedKingdom);

  const france = createCountryForCms(
    {
      title: "France",
      description: "Out-of-scope country helper coverage.",
      coverImage: "https://example.com/france.jpg",
    },
    adminActor,
    dbInstance,
  );

  setCountryModeratorCountryAssignments("country-mod-1", [unitedKingdom.id], "admin-1", dbInstance);

  const actor = getAuthActorContext("country-mod-1", dbInstance);
  const updatedCountry = await updateCmsCountry(
    {
      currentSlug: "united-kingdom",
      title: "United Kingdom Coast",
      slug: "united-kingdom",
      description: "Updated by a country moderator.",
      coverImage: "https://example.com/united-kingdom-coast.jpg",
    },
    actor,
    dbInstance,
  );
  const createdRegion = await createCmsRegion(
    {
      countrySlug: "united-kingdom",
      title: "Chalk Hills",
      description: "Created by a country moderator.",
      coverImage: "https://example.com/chalk-hills.jpg",
    },
    actor,
    dbInstance,
  );
  const updatedRegion = await updateCmsRegion(
    {
      currentCountrySlug: "united-kingdom",
      currentRegionSlug: "chalk-hills",
      countrySlug: "united-kingdom",
      title: "Chalk Hills Coast",
      slug: "chalk-hills-coast",
      description: "Updated by a country moderator.",
      coverImage: "https://example.com/chalk-hills-coast.jpg",
    },
    actor,
    dbInstance,
  );

  assert.equal(updatedCountry.redirectTo, "/cms/countries/united-kingdom");
  assert.equal(createdRegion.redirectTo, "/cms/regions/united-kingdom/chalk-hills");
  assert.equal(updatedRegion.redirectTo, "/cms/regions/united-kingdom/chalk-hills-coast");

  await assert.rejects(
    () =>
      updateCmsCountry(
        {
          currentSlug: france.slug,
          title: "France Atlantic",
          slug: france.slug,
          description: "Out-of-scope update should fail.",
          coverImage: "https://example.com/france-atlantic.jpg",
        },
        actor,
        dbInstance,
      ),
    /assigned to you/i,
  );
  await assert.rejects(
    () =>
      createCmsRegion(
        {
          countrySlug: france.slug,
          title: "Normandy Coast",
          description: "Out-of-scope create should fail.",
          coverImage: "https://example.com/normandy-coast.jpg",
        },
        actor,
        dbInstance,
      ),
    /assigned to you/i,
  );
});

test("CMS destination helpers redirect to the canonical slugged routes after destination edits", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();
  setUserRole("admin-1", "admin", dbInstance);
  const actor = getAuthActorContext("admin-1", dbInstance);
  const dorset = dbInstance.sqlite.prepare("select id from regions where slug = ?").get("dorset") as { id: string } | undefined;

  assert.ok(dorset);

  const created = await createCmsDestination(
    {
      countrySlug: "united-kingdom",
      title: "Harbour Cliffs",
      description: "Destination helper coverage.",
      coverImage: "https://example.com/harbour-cliffs.jpg",
      regionIds: [dorset.id],
    },
    actor,
    dbInstance,
  );

  assert.equal(created.redirectTo, "/cms/destinations/united-kingdom/harbour-cliffs");

  const updated = await updateCmsDestination(
    {
      currentCountrySlug: "united-kingdom",
      currentDestinationSlug: "harbour-cliffs",
      countrySlug: "united-kingdom",
      title: "Harbour Sea Cliffs",
      slug: "harbour-sea-cliffs",
      description: "Updated destination helper coverage.",
      coverImage: "https://example.com/harbour-sea-cliffs.jpg",
      regionIds: [dorset.id],
    },
    actor,
    dbInstance,
  );

  assert.equal(updated.redirectTo, "/cms/destinations/united-kingdom/harbour-sea-cliffs");
});

test("destination access helpers allow in-scope moderators, redirect out-of-scope moderators, and keep admin access global", (t) => {
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
  const dorset = dbInstance.sqlite.prepare("select id from regions where slug = ?").get("dorset") as { id: string } | undefined;
  const devon = dbInstance.sqlite.prepare("select id from regions where slug = ?").get("devon") as { id: string } | undefined;

  assert.ok(dorset);
  assert.ok(devon);

  const dorsetDestination = createDestinationForCms(
    {
      countrySlug: "united-kingdom",
      title: "Stone Harbours",
      description: "Moderator in-scope destination.",
      coverImage: "https://example.com/stone-harbours.jpg",
      regionIds: [dorset.id],
    },
    adminActor,
    dbInstance,
  );
  const devonDestination = createDestinationForCms(
    {
      countrySlug: "united-kingdom",
      title: "River Valleys",
      description: "Moderator out-of-scope destination.",
      coverImage: "https://example.com/river-valleys.jpg",
      regionIds: [devon.id],
    },
    adminActor,
    dbInstance,
  );

  setModeratorRegionAssignments("moderator-1", [dorset.id], "admin-1", dbInstance);
  const moderatorActor = getAuthActorContext("moderator-1", dbInstance);

  const inScope = resolveCmsDestinationAccess(
    "united-kingdom",
    dorsetDestination.slug,
    moderatorActor,
    dbInstance,
  );
  const outOfScope = resolveCmsDestinationAccess(
    "united-kingdom",
    devonDestination.slug,
    moderatorActor,
    dbInstance,
  );
  const adminView = resolveCmsDestinationAccess(
    "united-kingdom",
    devonDestination.slug,
    adminActor,
    dbInstance,
  );

  assert.equal(inScope?.kind, "destination");
  assert.deepEqual(outOfScope, { kind: "redirect", redirectTo: "/cms/destinations" });
  assert.equal(adminView?.kind, "destination");

  const errorMessage = getCmsDestinationActionErrorMessage(new Error("Destination failure"));
  assert.equal(errorMessage, "Destination failure");
});

test("CMS listing helpers redirect to canonical slugged routes after listing edits and lifecycle changes", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);

  dbInstance.db.insert(user).values({
    id: "admin-1",
    name: "Admin User",
    email: "admin@example.com",
  }).run();
  setUserRole("admin-1", "admin", dbInstance);
  const actor = getAuthActorContext("admin-1", dbInstance);
  const dorset = dbInstance.sqlite.prepare("select id from regions where slug = ?").get("dorset") as { id: string } | undefined;
  const jurassicCoast = dbInstance.sqlite
    .prepare("select id from destinations where slug = ?")
    .get("jurassic-coast") as { id: string } | undefined;

  assert.ok(dorset);
  assert.ok(jurassicCoast);

  const created = await createCmsListing(
    {
      regionId: dorset.id,
      title: "Harbour Steps",
      shortDescription: "Listing helper coverage.",
      description: "Create helper coverage.",
      coverImage: "https://example.com/harbour-steps.jpg",
      categorySlug: "beach",
      busynessRating: 2,
      latitude: 50.61,
      longitude: -2.45,
      destinationIds: [jurassicCoast.id],
    },
    actor,
    dbInstance,
  );

  assert.equal(created.redirectTo, "/cms/listings/united-kingdom/dorset/harbour-steps");

  const updated = await updateCmsListing(
    {
      currentCountrySlug: "united-kingdom",
      currentRegionSlug: "dorset",
      currentListingSlug: "harbour-steps",
      title: "Harbour Steps Viewpoint",
      slug: "harbour-steps-viewpoint",
      shortDescription: "Updated helper coverage.",
      description: "Updated helper coverage.",
      coverImage: "https://example.com/harbour-steps-viewpoint.jpg",
      categorySlug: "beach",
      busynessRating: 3,
      latitude: 50.62,
      longitude: -2.44,
      destinationIds: [jurassicCoast.id],
    },
    actor,
    dbInstance,
  );

  assert.equal(updated.redirectTo, "/cms/listings/united-kingdom/dorset/harbour-steps-viewpoint");

  const published = await publishCmsListing(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      listingSlug: "harbour-steps-viewpoint",
    },
    actor,
    dbInstance,
  );
  assert.equal(published.redirectTo, "/cms/listings/united-kingdom/dorset/harbour-steps-viewpoint");

  const trashed = await trashCmsListing(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      listingSlug: "harbour-steps-viewpoint",
    },
    actor,
    dbInstance,
  );
  assert.equal(trashed.redirectTo, "/cms/listings/united-kingdom/dorset/harbour-steps-viewpoint");
});

test("listing access helpers allow in-scope moderators, redirect out-of-scope moderators, and keep admin access global", (t) => {
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
  const dorset = dbInstance.sqlite.prepare("select id from regions where slug = ?").get("dorset") as { id: string } | undefined;
  const devon = dbInstance.sqlite.prepare("select id from regions where slug = ?").get("devon") as { id: string } | undefined;
  const peakDistrict = dbInstance.sqlite
    .prepare("select id from destinations where slug = ?")
    .get("peak-district-national-park") as { id: string } | undefined;

  assert.ok(dorset);
  assert.ok(devon);
  assert.ok(peakDistrict);

  const inScopeListing = createListingForCms(
    {
      regionId: dorset.id,
      title: "Stone Harbour",
      shortDescription: "Moderator in-scope listing.",
      description: "Moderator in-scope listing.",
      coverImage: "https://example.com/stone-harbour.jpg",
      categorySlug: "beach",
      busynessRating: 2,
      latitude: 50.61,
      longitude: -2.45,
      destinationIds: [],
    },
    adminActor,
    dbInstance,
  );
  const outOfScopeListing = createListingForCms(
    {
      regionId: devon.id,
      title: "Hidden Estuary",
      shortDescription: "Moderator out-of-scope listing.",
      description: "Moderator out-of-scope listing.",
      coverImage: "https://example.com/hidden-estuary.jpg",
      categorySlug: "beach",
      busynessRating: 2,
      latitude: 50.7,
      longitude: -3.2,
      destinationIds: [peakDistrict.id],
    },
    adminActor,
    dbInstance,
  );

  setModeratorRegionAssignments("moderator-1", [dorset.id], "admin-1", dbInstance);
  const moderatorActor = getAuthActorContext("moderator-1", dbInstance);

  const inScope = resolveCmsListingAccess(
    "united-kingdom",
    "dorset",
    inScopeListing.slug,
    moderatorActor,
    dbInstance,
  );
  const outOfScope = resolveCmsListingAccess(
    "united-kingdom",
    "devon",
    outOfScopeListing.slug,
    moderatorActor,
    dbInstance,
  );
  const adminView = resolveCmsListingAccess(
    "united-kingdom",
    "devon",
    outOfScopeListing.slug,
    adminActor,
    dbInstance,
  );

  assert.equal(inScope?.kind, "listing");
  assert.deepEqual(outOfScope, { kind: "redirect", redirectTo: "/cms/listings" });
  assert.equal(adminView?.kind, "listing");

  const errorMessage = getCmsListingActionErrorMessage(new Error("Listing failure"));
  assert.equal(errorMessage, "Listing failure");
});
