import assert from "node:assert/strict";
import test from "node:test";

import { getURLFromRedirectError } from "next/dist/client/components/redirect.js";
import { isRedirectError } from "next/dist/client/components/redirect-error.js";

import { regions, user } from "@explorers-map/db";
import { getAuthActorContext, setUserRole } from "@explorers-map/services";

import {
  createCmsCountry,
  createCmsRegion,
  createCmsUser,
  getCmsActionErrorMessage,
  updateCmsCountry,
  updateCmsRegion,
} from "./lib/cms-admin.ts";
import { createAuth } from "./lib/auth.ts";
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
