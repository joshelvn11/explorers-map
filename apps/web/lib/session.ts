import { canAccessAdminCms, canAccessCms, getAuthActorContext } from "@explorers-map/services";
import type { DbInstance } from "@explorers-map/db";
import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { getAuth, type ExplorersMapAuth } from "./auth.ts";
import { sanitizeReturnTo } from "./auth-redirect.ts";
import { getAccountHref, getCmsHref, getSignInHref } from "./routes.ts";

export async function getSessionFromHeaders(requestHeaders: HeadersInit, authInstance: ExplorersMapAuth = getAuth()) {
  return authInstance.api.getSession({
    headers: requestHeaders instanceof Headers ? requestHeaders : new Headers(requestHeaders),
  });
}

export async function getCurrentSession(authInstance: ExplorersMapAuth = getAuth()) {
  return getSessionFromHeaders(await headers(), authInstance);
}

export async function getActorContextFromHeaders(
  requestHeaders: HeadersInit,
  authInstance: ExplorersMapAuth = getAuth(),
  dbInstance?: DbInstance,
) {
  const session = await getSessionFromHeaders(requestHeaders, authInstance);

  if (!session?.user?.id) {
    return null;
  }

  return getAuthActorContext(session.user.id, dbInstance);
}

export async function getCurrentActorContext(authInstance: ExplorersMapAuth = getAuth(), dbInstance?: DbInstance) {
  return getActorContextFromHeaders(await headers(), authInstance, dbInstance);
}

export async function requireAuthenticatedSessionFromHeaders(
  requestHeaders: HeadersInit,
  returnTo?: string | null,
  authInstance: ExplorersMapAuth = getAuth(),
) {
  const session = await getSessionFromHeaders(requestHeaders, authInstance);

  if (!session?.user?.id) {
    redirect(getSignInHref(sanitizeReturnTo(returnTo) ?? undefined));
  }

  return session;
}

export async function requireAuthenticatedSession(returnTo?: string | null, authInstance: ExplorersMapAuth = getAuth()) {
  return requireAuthenticatedSessionFromHeaders(await headers(), returnTo, authInstance);
}

export async function requireCmsActorFromHeaders(
  requestHeaders: HeadersInit,
  returnTo?: string | null,
  authInstance: ExplorersMapAuth = getAuth(),
  dbInstance?: DbInstance,
) {
  const session = await requireAuthenticatedSessionFromHeaders(requestHeaders, returnTo ?? getCmsHref(), authInstance);
  const actor = getAuthActorContext(session.user.id, dbInstance);

  if (!canAccessCms(actor)) {
    redirect(getAccountHref());
  }

  return actor;
}

export async function requireCmsActor(returnTo?: string | null, authInstance: ExplorersMapAuth = getAuth(), dbInstance?: DbInstance) {
  return requireCmsActorFromHeaders(await headers(), returnTo, authInstance, dbInstance);
}

export async function requireAdminActorFromHeaders(
  requestHeaders: HeadersInit,
  returnTo?: string | null,
  authInstance: ExplorersMapAuth = getAuth(),
  dbInstance?: DbInstance,
) {
  const session = await requireAuthenticatedSessionFromHeaders(requestHeaders, returnTo ?? getCmsHref(), authInstance);
  const actor = getAuthActorContext(session.user.id, dbInstance);

  if (!canAccessAdminCms(actor)) {
    redirect(getCmsHref());
  }

  return actor;
}

export async function requireAdminActor(
  returnTo?: string | null,
  authInstance: ExplorersMapAuth = getAuth(),
  dbInstance?: DbInstance,
) {
  return requireAdminActorFromHeaders(await headers(), returnTo, authInstance, dbInstance);
}

export async function redirectIfAuthenticated(returnTo?: string | null, authInstance: ExplorersMapAuth = getAuth()) {
  const session = await getCurrentSession(authInstance);

  if (!session?.user?.id) {
    return;
  }

  const safeReturnTo = sanitizeReturnTo(returnTo);

  if (safeReturnTo) {
    redirect(safeReturnTo);
  }

  const actor = getAuthActorContext(session.user.id);
  redirect(canAccessCms(actor) ? getCmsHref() : getAccountHref());
}
