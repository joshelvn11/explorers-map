"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error.js";
import { redirect } from "next/navigation";

import {
  createCmsCountry,
  createCmsRegion,
  createCmsUser,
  getCmsActionErrorMessage,
  updateCmsCountry,
  updateCmsRegion,
  updateCmsUser,
} from "../../lib/cms-admin.ts";
import type { CmsFormState } from "../../lib/cms-form-state.ts";
import {
  createCmsDestination,
  getCmsActionErrorMessage as getDestinationActionErrorMessage,
  updateCmsDestination,
} from "../../lib/cms-destinations.ts";
import {
  createCmsListing,
  getCmsActionErrorMessage as getListingActionErrorMessage,
  publishCmsListing,
  restoreCmsListing,
  trashCmsListing,
  unpublishCmsListing,
  updateCmsListing,
} from "../../lib/cms-listings.ts";
import { requireAdminActor, requireCmsActor, requireCountryModeratorActor } from "../../lib/session.ts";

export async function createUserAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const actor = await requireCountryModeratorActor("/cms/users/new");

  try {
    const result = await createCmsUser(
      {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        role: String(formData.get("role") ?? "viewer") as "admin" | "country_moderator" | "moderator" | "viewer",
        moderatorRegionIds: formData.getAll("moderatorRegionIds").map(String),
        countryModeratorCountryIds: formData.getAll("countryModeratorCountryIds").map(String),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getCmsActionErrorMessage(error),
    };
  }
}

export async function updateUserAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const actor = await requireCountryModeratorActor(`/cms/users/${String(formData.get("userId") ?? "")}`);

  try {
    const result = await updateCmsUser(
      {
        userId: String(formData.get("userId") ?? ""),
        role: String(formData.get("role") ?? "viewer") as "admin" | "country_moderator" | "moderator" | "viewer",
        moderatorRegionIds: formData.getAll("moderatorRegionIds").map(String),
        countryModeratorCountryIds: formData.getAll("countryModeratorCountryIds").map(String),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getCmsActionErrorMessage(error),
    };
  }
}

export async function createCountryAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const actor = await requireAdminActor("/cms/countries/new");

  try {
    const result = await createCmsCountry(
      {
        title: String(formData.get("title") ?? ""),
        slug: optionalString(formData.get("slug")),
        description: String(formData.get("description") ?? ""),
        coverImage: String(formData.get("coverImage") ?? ""),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getCmsActionErrorMessage(error),
    };
  }
}

export async function updateCountryAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const currentSlug = String(formData.get("currentSlug") ?? "");
  const actor = await requireCountryModeratorActor(`/cms/countries/${currentSlug}`);

  try {
    const result = await updateCmsCountry(
      {
        currentSlug,
        title: String(formData.get("title") ?? ""),
        slug: optionalString(formData.get("slug")),
        description: String(formData.get("description") ?? ""),
        coverImage: String(formData.get("coverImage") ?? ""),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getCmsActionErrorMessage(error),
    };
  }
}

export async function createRegionAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const actor = await requireCountryModeratorActor("/cms/regions/new");

  try {
    const result = await createCmsRegion(
      {
        countrySlug: String(formData.get("countrySlug") ?? ""),
        title: String(formData.get("title") ?? ""),
        slug: optionalString(formData.get("slug")),
        description: String(formData.get("description") ?? ""),
        coverImage: String(formData.get("coverImage") ?? ""),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getCmsActionErrorMessage(error),
    };
  }
}

export async function updateRegionAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const currentCountrySlug = String(formData.get("currentCountrySlug") ?? "");
  const currentRegionSlug = String(formData.get("currentRegionSlug") ?? "");
  const actor = await requireCountryModeratorActor(`/cms/regions/${currentCountrySlug}/${currentRegionSlug}`);

  try {
    const result = await updateCmsRegion(
      {
        currentCountrySlug,
        currentRegionSlug,
        countrySlug: String(formData.get("countrySlug") ?? ""),
        title: String(formData.get("title") ?? ""),
        slug: optionalString(formData.get("slug")),
        description: String(formData.get("description") ?? ""),
        coverImage: String(formData.get("coverImage") ?? ""),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getCmsActionErrorMessage(error),
    };
  }
}

export async function createDestinationAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const actor = await requireCmsActor("/cms/destinations/new");

  try {
    const result = await createCmsDestination(
      {
        countrySlug: String(formData.get("countrySlug") ?? ""),
        title: String(formData.get("title") ?? ""),
        slug: optionalString(formData.get("slug")),
        description: String(formData.get("description") ?? ""),
        coverImage: nullableString(formData.get("coverImage")),
        regionIds: formData.getAll("regionIds").map(String),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getDestinationActionErrorMessage(error),
    };
  }
}

export async function updateDestinationAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const currentCountrySlug = String(formData.get("currentCountrySlug") ?? "");
  const currentDestinationSlug = String(formData.get("currentDestinationSlug") ?? "");
  const actor = await requireCmsActor(`/cms/destinations/${currentCountrySlug}/${currentDestinationSlug}`);

  try {
    const result = await updateCmsDestination(
      {
        currentCountrySlug,
        currentDestinationSlug,
        countrySlug: String(formData.get("countrySlug") ?? ""),
        title: String(formData.get("title") ?? ""),
        slug: optionalString(formData.get("slug")),
        description: String(formData.get("description") ?? ""),
        coverImage: nullableString(formData.get("coverImage")),
        regionIds: formData.getAll("regionIds").map(String),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getDestinationActionErrorMessage(error),
    };
  }
}

export async function createListingAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const actor = await requireCmsActor("/cms/listings/new");

  try {
    const result = await createCmsListing(
      {
        regionId: String(formData.get("regionId") ?? ""),
        title: String(formData.get("title") ?? ""),
        slug: optionalString(formData.get("slug")),
        shortDescription: String(formData.get("shortDescription") ?? ""),
        description: String(formData.get("description") ?? ""),
        coverImage: nullableString(formData.get("coverImage")),
        categorySlug: nullableString(formData.get("categorySlug")),
        busynessRating: nullableNumber(formData.get("busynessRating")),
        latitude: nullableNumber(formData.get("latitude")),
        longitude: nullableNumber(formData.get("longitude")),
        googleMapsPlaceUrl: nullableString(formData.get("googleMapsPlaceUrl")),
        destinationIds: formData.getAll("destinationIds").map(String),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getListingActionErrorMessage(error),
    };
  }
}

export async function updateListingAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const currentCountrySlug = String(formData.get("currentCountrySlug") ?? "");
  const currentRegionSlug = String(formData.get("currentRegionSlug") ?? "");
  const currentListingSlug = String(formData.get("currentListingSlug") ?? "");
  const actor = await requireCmsActor(`/cms/listings/${currentCountrySlug}/${currentRegionSlug}/${currentListingSlug}`);

  try {
    const result = await updateCmsListing(
      {
        currentCountrySlug,
        currentRegionSlug,
        currentListingSlug,
        title: String(formData.get("title") ?? ""),
        slug: optionalString(formData.get("slug")),
        shortDescription: String(formData.get("shortDescription") ?? ""),
        description: String(formData.get("description") ?? ""),
        coverImage: nullableString(formData.get("coverImage")),
        categorySlug: nullableString(formData.get("categorySlug")),
        busynessRating: nullableNumber(formData.get("busynessRating")),
        latitude: nullableNumber(formData.get("latitude")),
        longitude: nullableNumber(formData.get("longitude")),
        googleMapsPlaceUrl: nullableString(formData.get("googleMapsPlaceUrl")),
        destinationIds: formData.getAll("destinationIds").map(String),
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getListingActionErrorMessage(error),
    };
  }
}

export async function publishListingAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  return runListingLifecycleAction(formData, publishCmsListing);
}

export async function unpublishListingAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  return runListingLifecycleAction(formData, unpublishCmsListing);
}

export async function trashListingAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  return runListingLifecycleAction(formData, trashCmsListing);
}

export async function restoreListingAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  return runListingLifecycleAction(formData, restoreCmsListing);
}

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function nullableString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  return Number(normalized);
}

async function runListingLifecycleAction(
  formData: FormData,
  action: typeof publishCmsListing,
): Promise<CmsFormState> {
  const countrySlug = String(formData.get("countrySlug") ?? "");
  const regionSlug = String(formData.get("regionSlug") ?? "");
  const listingSlug = String(formData.get("listingSlug") ?? "");
  const actor = await requireCmsActor(`/cms/listings/${countrySlug}/${regionSlug}/${listingSlug}`);

  try {
    const result = await action(
      {
        countrySlug,
        regionSlug,
        listingSlug,
      },
      actor,
    );

    redirect(result.redirectTo);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      errorMessage: getListingActionErrorMessage(error),
    };
  }
}
