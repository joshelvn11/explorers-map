import type { DbInstance } from "@explorers-map/db";
import {
  createListingForCms,
  getListingForCms,
  publishListingForCms,
  restoreListingForCms,
  trashListingForCms,
  unpublishListingForCms,
  updateListingForCms,
  type AuthActorContext,
  type CreateCmsListingInput,
  type ListingCmsRecord,
  type UpdateCmsListingInput,
} from "@explorers-map/services";
import { isServiceError } from "@explorers-map/services/errors";

import { getCmsListingHref, getCmsListingsHref } from "./routes.ts";

export type CmsActionResult = {
  redirectTo: string;
};

export async function createCmsListing(
  input: CreateCmsListingInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const listing = createListingForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsListingHref(listing.countrySlug, listing.regionSlug, listing.slug),
  };
}

export async function updateCmsListing(
  input: UpdateCmsListingInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const listing = updateListingForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsListingHref(listing.countrySlug, listing.regionSlug, listing.slug),
  };
}

export async function publishCmsListing(
  input: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const listing = publishListingForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsListingHref(listing.countrySlug, listing.regionSlug, listing.slug),
  };
}

export async function unpublishCmsListing(
  input: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const listing = unpublishListingForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsListingHref(listing.countrySlug, listing.regionSlug, listing.slug),
  };
}

export async function trashCmsListing(
  input: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const listing = trashListingForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsListingHref(listing.countrySlug, listing.regionSlug, listing.slug),
  };
}

export async function restoreCmsListing(
  input: { countrySlug: string; regionSlug: string; listingSlug: string },
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const listing = restoreListingForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsListingHref(listing.countrySlug, listing.regionSlug, listing.slug),
  };
}

export function resolveCmsListingAccess(
  countrySlug: string,
  regionSlug: string,
  listingSlug: string,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
):
  | { kind: "listing"; listing: ListingCmsRecord }
  | { kind: "redirect"; redirectTo: string }
  | null {
  try {
    const listing = getListingForCms(countrySlug, regionSlug, listingSlug, actor, dbInstance);

    if (!listing) {
      return null;
    }

    return {
      kind: "listing",
      listing,
    };
  } catch (error) {
    if (isServiceError(error) && error.code === "FORBIDDEN") {
      return {
        kind: "redirect",
        redirectTo: getCmsListingsHref(),
      };
    }

    throw error;
  }
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
