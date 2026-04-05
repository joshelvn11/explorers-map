import type { DbInstance } from "@explorers-map/db";
import {
  createDestinationForCms,
  getDestinationForCms,
  type AuthActorContext,
  type DestinationCmsRecord,
  type UpsertDestinationInput,
  updateDestinationForCms,
} from "@explorers-map/services";
import { isServiceError } from "@explorers-map/services/errors";

import { getCmsDestinationHref, getCmsDestinationsHref } from "./routes.ts";

export type CmsActionResult = {
  redirectTo: string;
};

export async function createCmsDestination(
  input: UpsertDestinationInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const destination = createDestinationForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsDestinationHref(destination.countrySlug, destination.slug),
  };
}

export async function updateCmsDestination(
  input: UpsertDestinationInput,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): Promise<CmsActionResult> {
  const destination = updateDestinationForCms(input, actor, dbInstance);

  return {
    redirectTo: getCmsDestinationHref(destination.countrySlug, destination.slug),
  };
}

export function resolveCmsDestinationAccess(
  countrySlug: string,
  destinationSlug: string,
  actor: AuthActorContext,
  dbInstance?: DbInstance,
): { kind: "destination"; destination: DestinationCmsRecord } | { kind: "redirect"; redirectTo: string } | null {
  try {
    const destination = getDestinationForCms(countrySlug, destinationSlug, actor, dbInstance);

    if (!destination) {
      return null;
    }

    return {
      kind: "destination",
      destination,
    };
  } catch (error) {
    if (isServiceError(error) && error.code === "FORBIDDEN") {
      return {
        kind: "redirect",
        redirectTo: getCmsDestinationsHref(),
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
