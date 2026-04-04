import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import { NextRequest } from "next/server.js";

import { rateLimit } from "@explorers-map/db";
import { canAccessCms, getAuthActorContext, getUserRole } from "@explorers-map/services";

import { listCountriesHandler } from "./lib/actions-handlers.ts";
import { createAuth } from "./lib/auth.ts";
import { initializeBootstrapAdmin } from "./lib/bootstrap-admin.ts";
import { getSessionFromHeaders } from "./lib/session.ts";
import { config as proxyConfig, proxy } from "./proxy.ts";
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

function withAuthEnv(t: TestContext) {
  const originalUrl = process.env.BETTER_AUTH_URL;
  const originalSecret = process.env.BETTER_AUTH_SECRET;
  process.env.BETTER_AUTH_URL = baseUrl;
  process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-value-1234567890";
  t.after(() => {
    process.env.BETTER_AUTH_URL = originalUrl;
    process.env.BETTER_AUTH_SECRET = originalSecret;
  });
}

test("signup, signin, signout, viewer role creation, and database rate limiting work together", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);
  const auth = createAuth({ dbInstance, enableNextCookies: false });

  const signUpResponse = await auth.handler(
    buildAuthRequest("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: "Viewer Person",
        email: "viewer@example.com",
        password: "password123",
      }),
    }),
  );

  assert.equal(signUpResponse.status, 200);

  const signUpCookieHeader = toCookieHeader(signUpResponse);
  assert.ok(signUpCookieHeader.includes("="));

  const signedUpSession = await getSessionFromHeaders(
    new Headers({
      cookie: signUpCookieHeader,
    }),
    auth,
  );

  assert.equal(signedUpSession?.user.email, "viewer@example.com");

  const signedUpUser = dbInstance.sqlite
    .prepare("select id from user where email = ?")
    .get("viewer@example.com") as { id: string } | undefined;

  assert.ok(signedUpUser);
  assert.equal(getUserRole(signedUpUser.id, dbInstance)?.role, "viewer");
  assert.equal(canAccessCms(getAuthActorContext(signedUpUser.id, dbInstance)), false);

  const rateLimitEntries = dbInstance.db.select().from(rateLimit).all();
  assert.ok(rateLimitEntries.length > 0);

  const signOutResponse = await auth.handler(
    buildAuthRequest(
      "/api/auth/sign-out",
      {
        method: "POST",
      },
      signUpCookieHeader,
    ),
  );

  assert.equal(signOutResponse.status, 200);

  const signedOutSession = await getSessionFromHeaders(
    new Headers({
      cookie: signUpCookieHeader,
    }),
    auth,
  );

  assert.equal(signedOutSession, null);

  const signInResponse = await auth.handler(
    buildAuthRequest("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email: "viewer@example.com",
        password: "password123",
      }),
    }),
  );

  assert.equal(signInResponse.status, 200);

  const signInCookieHeader = toCookieHeader(signInResponse);
  const signedInSession = await getSessionFromHeaders(
    new Headers({
      cookie: signInCookieHeader,
    }),
    auth,
  );

  assert.equal(signedInSession?.user.email, "viewer@example.com");
});

test("proxy protects only the browser-auth account and cms routes", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);
  const auth = createAuth({ dbInstance, enableNextCookies: false });

  assert.deepEqual(proxyConfig.matcher, ["/account/:path*", "/cms/:path*"]);

  const anonymousResponse = proxy(new NextRequest(`${baseUrl}/account`));
  assert.equal(anonymousResponse.status, 307);
  assert.equal(anonymousResponse.headers.get("location"), `${baseUrl}/sign-in?returnTo=%2Faccount`);

  const signUpResponse = await auth.handler(
    buildAuthRequest("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: "Proxy User",
        email: "proxy@example.com",
        password: "password123",
      }),
    }),
  );
  const cookieHeader = toCookieHeader(signUpResponse);

  const authenticatedResponse = proxy(
    new NextRequest(`${baseUrl}/account`, {
      headers: {
        cookie: cookieHeader,
      },
    }),
  );

  assert.equal(authenticatedResponse.headers.get("location"), null);
});

test("bootstrap admin initialization is idempotent and does not rewrite an existing admin", async (t) => {
  withAuthEnv(t);
  const dbInstance = createSeededTestDb(t);
  const originalName = process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_NAME;
  const originalEmail = process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_EMAIL;
  const originalPassword = process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_PASSWORD;

  t.after(() => {
    process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_NAME = originalName;
    process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_EMAIL = originalEmail;
    process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_PASSWORD = originalPassword;
  });

  delete process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_NAME;
  delete process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_EMAIL;
  delete process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_PASSWORD;

  assert.deepEqual(await initializeBootstrapAdmin(dbInstance), {
    status: "skipped_missing_env",
  });

  process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_NAME = "Bootstrap Admin";
  process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_EMAIL = "admin@example.com";
  process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_PASSWORD = "password123";

  const created = await initializeBootstrapAdmin(dbInstance);
  assert.equal(created.status, "created");

  const adminUser = dbInstance.sqlite
    .prepare("select id, email from user where email = ?")
    .get("admin@example.com") as { id: string; email: string } | undefined;

  assert.ok(adminUser);
  assert.equal(getUserRole(adminUser.id, dbInstance)?.role, "admin");

  process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_NAME = "Different Admin";
  process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_EMAIL = "different-admin@example.com";
  process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_PASSWORD = "different-password123";

  assert.deepEqual(await initializeBootstrapAdmin(dbInstance), {
    status: "skipped_existing_admin",
  });

  const changedEmailUser = dbInstance.sqlite
    .prepare("select id from user where email = ?")
    .get("different-admin@example.com") as { id: string } | undefined;

  assert.equal(changedEmailUser, undefined);
});

test("actions bearer-token auth remains separate from browser-session cookies", async (t) => {
  withAuthEnv(t);
  const originalActionsToken = process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN;
  process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = "actions-only-token";
  t.after(() => {
    process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = originalActionsToken;
  });

  const dbInstance = createSeededTestDb(t);
  const auth = createAuth({ dbInstance, enableNextCookies: false });

  const signUpResponse = await auth.handler(
    buildAuthRequest("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        name: "Cookie User",
        email: "cookie-user@example.com",
        password: "password123",
      }),
    }),
  );
  const cookieHeader = toCookieHeader(signUpResponse);

  const actionsResponse = await listCountriesHandler(
    new Request(`${baseUrl}/api/actions/v1/countries`, {
      headers: {
        cookie: cookieHeader,
      },
    }),
    dbInstance,
  );
  const payload = (await actionsResponse.json()) as { error: { code: string } };

  assert.equal(actionsResponse.status, 401);
  assert.equal(payload.error.code, "UNAUTHENTICATED");
});
