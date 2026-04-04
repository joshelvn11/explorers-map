import { canAccessCms, getAuthActorContext } from "@explorers-map/services";
import { headers } from "next/headers.js";
import { redirect } from "next/navigation.js";

import { auth } from "./auth.ts";
import { sanitizeReturnTo } from "./auth-redirect.ts";
import { getAccountHref, getCmsHref, getSignInHref } from "./routes.ts";

export async function getSessionFromHeaders(requestHeaders: HeadersInit, authInstance = auth) {
  return authInstance.api.getSession({
    headers: requestHeaders instanceof Headers ? requestHeaders : new Headers(requestHeaders),
  });
}

export async function getCurrentSession(authInstance = auth) {
  return getSessionFromHeaders(await headers(), authInstance);
}

export async function getCurrentActorContext(authInstance = auth) {
  const session = await getCurrentSession(authInstance);

  if (!session?.user?.id) {
    return null;
  }

  return getAuthActorContext(session.user.id);
}

export async function requireAuthenticatedSession(returnTo?: string | null, authInstance = auth) {
  const session = await getCurrentSession(authInstance);

  if (!session?.user?.id) {
    redirect(getSignInHref(sanitizeReturnTo(returnTo) ?? undefined));
  }

  return session;
}

export async function requireCmsActor(returnTo?: string | null, authInstance = auth) {
  const session = await requireAuthenticatedSession(returnTo ?? getCmsHref(), authInstance);
  const actor = getAuthActorContext(session.user.id);

  if (!canAccessCms(actor)) {
    redirect(getAccountHref());
  }

  return actor;
}

export async function redirectIfAuthenticated(returnTo?: string | null, authInstance = auth) {
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
