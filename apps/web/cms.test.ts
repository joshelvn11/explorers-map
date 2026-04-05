import assert from "node:assert/strict";
import test from "node:test";

import { getURLFromRedirectError } from "next/dist/client/components/redirect.js";
import { isRedirectError } from "next/dist/client/components/redirect-error.js";

import { regions, user } from "@explorers-map/db";
import { createDestinationForCms, createListingForCms, getAuthActorContext, setModeratorRegionAssignments, setUserRole } from "@explorers-map/services";

import {
  createCmsCountry,
  createCmsRegion,
  createCmsUser,
  getCmsActionErrorMessage,
  updateCmsCountry,
  updateCmsRegion,
} from "./lib/cms-admin.ts";
import { createAuth } from "./lib/auth.ts";
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
import { requireAdminActorFromHeaders } from "./lib/session.ts";
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
