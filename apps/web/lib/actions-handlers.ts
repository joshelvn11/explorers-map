import type { DbInstance } from "@explorers-map/db";
import {
  ensureDestination,
  ensureListing,
  ensureRegion,
  findDestination,
  findListing,
  findRegion,
  getCountryBySlug,
  getDestinationForEditor,
  getListingForEditor,
  getRegionForEditor,
  listCategories,
  listCountries,
  listDestinationsForEditor,
  listListingsForEditor,
  listRegionsForEditor,
  type CreateDestinationInput,
  type CreateListingDraftEditorInput,
  type CreateRegionInput,
} from "@explorers-map/services";

import {
  created,
  invalidInput,
  notFound,
  ok,
  parseJsonBody,
  parseLimit,
  parseOptionalNumber,
  readDraftOnlyOpenApiDocumentText,
  readOpenApiDocumentText,
  readProductionOpenApiDocumentText,
  requireSearchQuery,
  withActionsAuth,
  withoutAuth,
  type CreateDestinationBody,
  type CreateListingBody,
  type CreateRegionBody,
} from "./actions-api.ts";

const writeContext = {
  source: "actions-api",
  actorId: null,
} as const;

export function healthzHandler() {
  return withoutAuth(() => ok({ ok: true }));
}

export function openApiHandler() {
  return withoutAuth(() =>
    new Response(readOpenApiDocumentText(), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    }),
  );
}

export function openApiProductionHandler() {
  return withoutAuth(() =>
    new Response(readProductionOpenApiDocumentText(), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    }),
  );
}

export function openApiDraftOnlyHandler() {
  return withoutAuth(() =>
    new Response(readDraftOnlyOpenApiDocumentText(), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    }),
  );
}

export function listCountriesHandler(request: Request, dbInstance?: DbInstance) {
  return withActionsAuth(request, () => ok({ countries: listCountries(dbInstance) }));
}

export function getCountryHandler(request: Request, params: { countrySlug: string }, dbInstance?: DbInstance) {
  return withActionsAuth(request, () => {
    const country = getCountryBySlug(params.countrySlug, dbInstance);

    if (!country) {
      return notFound(`Country "${params.countrySlug}" was not found.`);
    }

    return ok({ country });
  });
}

export function listCategoriesHandler(request: Request, dbInstance?: DbInstance) {
  return withActionsAuth(request, () => ok({ categories: listCategories(dbInstance) }));
}

export function listRegionsHandler(request: Request, params: { countrySlug: string }, dbInstance?: DbInstance) {
  return withActionsAuth(request, () =>
    ok({
      regions: listRegionsForEditor(params.countrySlug, dbInstance),
    }),
  );
}

export function searchRegionsHandler(request: Request, params: { countrySlug: string }, dbInstance?: DbInstance) {
  return withActionsAuth(request, () => {
    const url = new URL(request.url);

    return ok(
      findRegion({
        countrySlug: params.countrySlug,
        query: requireSearchQuery(url),
        limit: parseLimit(url),
      }, dbInstance),
    );
  });
}

export function getRegionHandler(
  request: Request,
  params: { countrySlug: string; regionSlug: string },
  dbInstance?: DbInstance,
) {
  return withActionsAuth(request, () =>
    ok({
      region: getRegionForEditor(params, dbInstance),
    }),
  );
}

export function createRegionHandler(request: Request, params: { countrySlug: string }, dbInstance?: DbInstance) {
  return withActionsAuth(request, async () => {
    const body = await parseJsonBody<CreateRegionBody>(request);
    const input: CreateRegionInput = {
      countrySlug: params.countrySlug,
      title: body.title,
      description: body.description,
      coverImage: body.coverImage,
      slug: body.slug,
      evidence: body.evidence,
    };
    const result = ensureRegion(input, dbInstance);

    return result.status === "created" ? created(result) : ok(result);
  });
}

export function listDestinationsHandler(request: Request, params: { countrySlug: string }, dbInstance?: DbInstance) {
  return withActionsAuth(request, () => {
    const url = new URL(request.url);
    const regionSlug = url.searchParams.get("regionSlug")?.trim() || undefined;

    return ok({
      destinations: listDestinationsForEditor({
        countrySlug: params.countrySlug,
        regionSlug,
      }, dbInstance),
    });
  });
}

export function searchDestinationsHandler(
  request: Request,
  params: { countrySlug: string },
  dbInstance?: DbInstance,
) {
  return withActionsAuth(request, () => {
    const url = new URL(request.url);

    return ok(
      findDestination({
        countrySlug: params.countrySlug,
        query: requireSearchQuery(url),
        regionSlug: url.searchParams.get("regionSlug")?.trim() || undefined,
        limit: parseLimit(url),
      }, dbInstance),
    );
  });
}

export function getDestinationHandler(
  request: Request,
  params: { countrySlug: string; destinationSlug: string },
  dbInstance?: DbInstance,
) {
  return withActionsAuth(request, () =>
    ok({
      destination: getDestinationForEditor(params, dbInstance),
    }),
  );
}

export function createDestinationHandler(
  request: Request,
  params: { countrySlug: string },
  dbInstance?: DbInstance,
) {
  return withActionsAuth(request, async () => {
    const body = await parseJsonBody<CreateDestinationBody>(request);
    const input: CreateDestinationInput = {
      countrySlug: params.countrySlug,
      title: body.title,
      description: body.description,
      coverImage: body.coverImage,
      slug: body.slug,
      regionSlugs: body.regionSlugs,
      evidence: body.evidence,
    };
    const result = ensureDestination(input, dbInstance);

    return result.status === "created" ? created(result) : ok(result);
  });
}

export function listRegionListingsHandler(
  request: Request,
  params: { countrySlug: string; regionSlug: string },
  dbInstance?: DbInstance,
) {
  return withActionsAuth(request, () =>
    ok({
      listings: listListingsForEditor({
        countrySlug: params.countrySlug,
        regionSlug: params.regionSlug,
        includeDrafts: true,
      }, dbInstance),
    }),
  );
}

export function listDestinationListingsHandler(
  request: Request,
  params: { countrySlug: string; destinationSlug: string },
  dbInstance?: DbInstance,
) {
  return withActionsAuth(request, () =>
    ok({
      listings: listListingsForEditor({
        countrySlug: params.countrySlug,
        destinationSlug: params.destinationSlug,
        includeDrafts: true,
      }, dbInstance),
    }),
  );
}

export function searchListingsHandler(request: Request, params: { countrySlug: string }, dbInstance?: DbInstance) {
  return withActionsAuth(request, () => {
    const url = new URL(request.url);
    const latitude = parseOptionalNumber(url, "latitude");
    const longitude = parseOptionalNumber(url, "longitude");

    if ((latitude === undefined) !== (longitude === undefined)) {
      throw invalidInput("latitude and longitude must be provided together.");
    }

    return ok(
      findListing({
        countrySlug: params.countrySlug,
        query: requireSearchQuery(url),
        regionSlug: url.searchParams.get("regionSlug")?.trim() || undefined,
        destinationSlug: url.searchParams.get("destinationSlug")?.trim() || undefined,
        latitude,
        longitude,
        limit: parseLimit(url),
      }, dbInstance),
    );
  });
}

export function getListingHandler(
  request: Request,
  params: { countrySlug: string; regionSlug: string; listingSlug: string },
  dbInstance?: DbInstance,
) {
  return withActionsAuth(request, () => {
    const listing = getListingForEditor(params, dbInstance);

    if (listing.deletedAt) {
      return notFound(`Listing "${params.listingSlug}" was not found.`);
    }

    return ok({ listing });
  });
}

export function createListingHandler(
  request: Request,
  params: { countrySlug: string; regionSlug: string },
  dbInstance?: DbInstance,
) {
  return withActionsAuth(request, async () => {
    const body = await parseJsonBody<CreateListingBody>(request);
    const input: CreateListingDraftEditorInput = {
      countrySlug: params.countrySlug,
      regionSlug: params.regionSlug,
      title: body.title,
      shortDescription: body.shortDescription,
      description: body.description,
      latitude: body.latitude,
      longitude: body.longitude,
      busynessRating: body.busynessRating,
      googleMapsPlaceUrl: body.googleMapsPlaceUrl,
      coverImage: body.coverImage,
      categorySlug: body.categorySlug,
      slug: body.slug,
      destinationSlugs: body.destinationSlugs,
      images: body.images,
      evidence: body.evidence,
    };
    const result = ensureListing(input, writeContext, dbInstance);

    return result.status === "created" ? created(result) : ok(result);
  });
}
