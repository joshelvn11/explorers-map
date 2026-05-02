import {
  createCountryForCms,
  createRegionForCms,
  updateCountryForCms,
  updateCmsUserAccess,
  updateRegionForCms,
  type AuthActorContext,
} from "@explorers-map/services";
import type { DbInstance } from "@explorers-map/db";
import type { CmsRole } from "@explorers-map/db";
import { isServiceError } from "@explorers-map/services/errors";

import { createCmsUserAccount, type CreateCmsUserInput } from "./cms-user-auth.ts";
import {
  getCmsCountryHref,
  getCmsRegionHref,
  getCmsUserHref,
} from "./routes.ts";

export type CmsActionResult = {
  redirectTo: string;
};

export type UpdateCmsUserInput = {
  userId: string;
  role: CmsRole;
  moderatorRegionIds?: string[];
  countryModeratorCountryIds?: string[];
};

export type UpsertCmsCountryInput = {
  currentSlug?: string;
  title: string;
  slug?: string;
  description: string;
  coverImage: string;
};

export type UpsertCmsRegionInput = {
  currentCountrySlug?: string;
  currentRegionSlug?: string;
  countrySlug: string;
  title: string;
  slug?: string;
  description: string;
  coverImage: string;
};

export async function createCmsUser(
  input: CreateCmsUserInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const created = await createCmsUserAccount(input, actor, dbInstance);

  return {
    redirectTo: getCmsUserHref(created.userId),
  };
}

export async function updateCmsUser(
  input: UpdateCmsUserInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  updateCmsUserAccess(input, actor, dbInstance);

  return {
    redirectTo: getCmsUserHref(input.userId),
  };
}

export async function createCmsCountry(
  input: UpsertCmsCountryInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const country = createCountryForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsCountryHref(country.slug),
  };
}

export async function updateCmsCountry(
  input: UpsertCmsCountryInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const country = updateCountryForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsCountryHref(country.slug),
  };
}

export async function createCmsRegion(
  input: UpsertCmsRegionInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const region = createRegionForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsRegionHref(region.countrySlug, region.slug),
  };
}

export async function updateCmsRegion(
  input: UpsertCmsRegionInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const region = updateRegionForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsRegionHref(region.countrySlug, region.slug),
  };
}

export function getCmsActionErrorMessage(error: unknown) {
  if (isServiceError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
