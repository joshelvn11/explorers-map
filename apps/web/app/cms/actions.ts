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
import { requireAdminActor } from "../../lib/session.ts";

export async function createUserAction(_: CmsFormState, formData: FormData): Promise<CmsFormState> {
  const actor = await requireAdminActor("/cms/users/new");

  try {
    const result = await createCmsUser(
      {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        role: String(formData.get("role") ?? "viewer") as "admin" | "moderator" | "viewer",
        moderatorRegionIds: formData.getAll("moderatorRegionIds").map(String),
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
  const actor = await requireAdminActor(`/cms/users/${String(formData.get("userId") ?? "")}`);

  try {
    const result = await updateCmsUser(
      {
        userId: String(formData.get("userId") ?? ""),
        role: String(formData.get("role") ?? "viewer") as "admin" | "moderator" | "viewer",
        moderatorRegionIds: formData.getAll("moderatorRegionIds").map(String),
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
  const actor = await requireAdminActor(`/cms/countries/${currentSlug}`);

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
  const actor = await requireAdminActor("/cms/regions/new");

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
  const actor = await requireAdminActor(`/cms/regions/${currentCountrySlug}/${currentRegionSlug}`);

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

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
