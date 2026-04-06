import assert from "node:assert/strict";
import test from "node:test";

import {
  createDestinationHandler,
  createListingHandler,
  createRegionHandler,
  getCountryHandler,
  getDestinationHandler,
  getListingHandler,
  getRegionHandler,
  healthzHandler,
  listCategoriesHandler,
  listCountriesHandler,
  listDestinationListingsHandler,
  listDestinationsHandler,
  listRegionListingsHandler,
  listRegionsHandler,
  openApiHandler,
  openApiProductionHandler,
  searchDestinationsHandler,
  searchListingsHandler,
  searchRegionsHandler,
} from "./lib/actions-handlers.ts";
import { readOpenApiDocumentText, readProductionOpenApiDocumentText } from "./lib/actions-api.ts";
import { createListingDraftForEditor, trashListingForEditor } from "../../packages/services/index.ts";
import { createSeededTestDb } from "../../packages/services/test-helpers.ts";

const token = "test-actions-token";
const evidence = [
  {
    label: "Editorial source",
    note: "Verified for Actions API testing.",
    url: "https://example.com/source",
  },
];

function authorizedRequest(path: string, init: RequestInit = {}) {
  return new Request(`https://example.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

test("health and OpenAPI endpoints are available without auth", async () => {
  const health = await healthzHandler();
  const openApi = await openApiHandler();
  const productionOpenApi = await openApiProductionHandler();

  assert.equal(health.status, 200);
  assert.deepEqual(await readJson(health), { ok: true });

  assert.equal(openApi.status, 200);
  assert.equal(await openApi.text(), readOpenApiDocumentText());
  assert.equal(productionOpenApi.status, 200);
  assert.equal(await productionOpenApi.text(), readProductionOpenApiDocumentText());
});

test("protected Actions endpoints reject unauthenticated requests", async (t) => {
  const original = process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN;
  process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = token;
  t.after(() => {
    process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = original;
  });

  const response = await listCountriesHandler(new Request("https://example.com/api/actions/v1/countries"));
  const payload = await readJson(response);

  assert.equal(response.status, 401);
  assert.equal((payload.error as { code: string }).code, "UNAUTHENTICATED");
});

test("Actions read handlers expose countries, regions, destinations, listings, and search results", async (t) => {
  const original = process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN;
  process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = token;
  t.after(() => {
    process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = original;
  });

  const dbInstance = createSeededTestDb(t);

  const countriesResponse = await listCountriesHandler(authorizedRequest("/api/actions/v1/countries"), dbInstance);
  const categoriesResponse = await listCategoriesHandler(authorizedRequest("/api/actions/v1/categories"), dbInstance);
  const countryResponse = await getCountryHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom"),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const regionsResponse = await listRegionsHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions"),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const regionSearchResponse = await searchRegionsHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions/search?query=Dorset"),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const regionResponse = await getRegionHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions/dorset"),
    { countrySlug: "united-kingdom", regionSlug: "dorset" },
    dbInstance,
  );
  const destinationsResponse = await listDestinationsHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/destinations"),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const destinationSearchResponse = await searchDestinationsHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/destinations/search?query=Peak%20District"),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const destinationResponse = await getDestinationHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/destinations/jurassic-coast"),
    { countrySlug: "united-kingdom", destinationSlug: "jurassic-coast" },
    dbInstance,
  );
  const regionListingsResponse = await listRegionListingsHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions/dorset/listings"),
    { countrySlug: "united-kingdom", regionSlug: "dorset" },
    dbInstance,
  );
  const destinationListingsResponse = await listDestinationListingsHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/destinations/jurassic-coast/listings"),
    { countrySlug: "united-kingdom", destinationSlug: "jurassic-coast" },
    dbInstance,
  );
  const listingSearchResponse = await searchListingsHandler(
    authorizedRequest(
      "/api/actions/v1/countries/united-kingdom/listings/search?query=Durdle%20Door&regionSlug=dorset&latitude=50.6212&longitude=-2.2763",
    ),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const listingResponse = await getListingHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions/dorset/listings/durdle-door"),
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: "durdle-door" },
    dbInstance,
  );

  assert.equal(countriesResponse.status, 200);
  assert.equal(categoriesResponse.status, 200);
  assert.equal(countryResponse.status, 200);
  assert.equal(regionsResponse.status, 200);
  assert.equal(regionSearchResponse.status, 200);
  assert.equal(regionResponse.status, 200);
  assert.equal(destinationsResponse.status, 200);
  assert.equal(destinationSearchResponse.status, 200);
  assert.equal(destinationResponse.status, 200);
  assert.equal(regionListingsResponse.status, 200);
  assert.equal(destinationListingsResponse.status, 200);
  assert.equal(listingSearchResponse.status, 200);
  assert.equal(listingResponse.status, 200);

  assert.equal(((await readJson(countriesResponse)).countries as Array<unknown>).length > 0, true);
  assert.equal(((await readJson(categoriesResponse)).categories as Array<unknown>).length > 0, true);
  assert.equal(((await readJson(countryResponse)).country as { slug: string }).slug, "united-kingdom");
  assert.equal(((await readJson(regionResponse)).region as { slug: string }).slug, "dorset");
  assert.equal(((await readJson(destinationResponse)).destination as { slug: string }).slug, "jurassic-coast");
  assert.equal(((await readJson(listingResponse)).listing as { slug: string }).slug, "durdle-door");
  assert.equal(((await readJson(regionSearchResponse)).status as string), "exact_match");
  assert.equal(((await readJson(destinationSearchResponse)).status as string), "candidate_matches");
  assert.equal(((await readJson(listingSearchResponse)).status as string), "exact_match");

  createListingDraftForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      title: "Editorial Draft Cove",
      shortDescription: "Draft listing only visible to editorial reads.",
      description: "Draft visibility through Actions API.",
      latitude: 50.68,
      longitude: -2.33,
      busynessRating: 2,
      coverImage: "https://example.com/editorial-draft-cove.jpg",
      categorySlug: "beach",
      evidence,
    },
    { source: "actions-test", actorId: null },
    dbInstance,
  );

  const refreshedRegionListings = await listRegionListingsHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions/dorset/listings"),
    { countrySlug: "united-kingdom", regionSlug: "dorset" },
    dbInstance,
  );
  const refreshedRegionListingsPayload = await readJson(refreshedRegionListings);

  assert.ok(
    (refreshedRegionListingsPayload.listings as Array<{ slug: string }>).some(
      (listing) => listing.slug === "editorial-draft-cove",
    ),
  );
});

test("Actions create handlers return ensure-style results and hide trashed listings from read/search endpoints", async (t) => {
  const original = process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN;
  process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = token;
  t.after(() => {
    process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = original;
  });

  const dbInstance = createSeededTestDb(t);

  const insufficientRegion = await createRegionHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions", {
      method: "POST",
      body: JSON.stringify({
        title: "Unverified Ridge",
        description: "Should stop without evidence.",
        coverImage: "https://example.com/unverified-ridge.jpg",
      }),
    }),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const matchedDestination = await createDestinationHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/destinations", {
      method: "POST",
      body: JSON.stringify({
        title: "Jurassic Coast",
        description: "Existing destination should match.",
        coverImage: "https://example.com/jurassic-coast.jpg",
        evidence,
      }),
    }),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const createdRegion = await createRegionHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions", {
      method: "POST",
      body: JSON.stringify({
        title: "Granite Coast Highlands",
        description: "A clearly unique region for Actions API testing.",
        coverImage: "https://example.com/granite-coast-highlands.jpg",
        evidence,
      }),
    }),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const matchedListing = await createListingHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions/dorset/listings", {
      method: "POST",
      body: JSON.stringify({
        title: "Durdle Door",
        shortDescription: "Should match the existing listing.",
        description: "This should return an exact duplicate-safe match.",
        latitude: 50.6212,
        longitude: -2.2763,
        busynessRating: 5,
        coverImage: "https://example.com/durdle-door.jpg",
        categorySlug: "natural-attraction",
        evidence,
      }),
    }),
    { countrySlug: "united-kingdom", regionSlug: "dorset" },
    dbInstance,
  );
  const createdListing = await createListingHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions/dorset/listings", {
      method: "POST",
      body: JSON.stringify({
        title: "Hidden Stone Arch",
        shortDescription: "A quiet rock arch off the main trail.",
        description: "A new draft listing created through the Actions API tests.",
        latitude: 50.6123,
        longitude: -2.2888,
        busynessRating: 2,
        coverImage: "https://example.com/hidden-stone-arch.jpg",
        categorySlug: "natural-attraction",
        destinationSlugs: ["jurassic-coast"],
        images: [
          {
            imageUrl: "https://example.com/hidden-stone-arch-gallery.jpg",
            sortOrder: 1
          }
        ],
        evidence,
      }),
    }),
    { countrySlug: "united-kingdom", regionSlug: "dorset" },
    dbInstance,
  );

  assert.equal(insufficientRegion.status, 200);
  assert.equal((await readJson(insufficientRegion)).status, "insufficient_evidence");
  assert.equal(matchedDestination.status, 200);
  assert.equal((await readJson(matchedDestination)).status, "matched");
  assert.equal(createdRegion.status, 201);
  assert.equal((await readJson(createdRegion)).status, "created");
  assert.equal(matchedListing.status, 200);
  assert.equal((await readJson(matchedListing)).status, "matched");
  assert.equal(createdListing.status, 201);
  assert.equal((await readJson(createdListing)).status, "created");

  const trashed = createListingDraftForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      title: "Hidden Jetty",
      shortDescription: "Will be trashed before being read.",
      description: "Trash filtering coverage for the Actions API.",
      latitude: 50.67,
      longitude: -2.29,
      busynessRating: 1,
      coverImage: "https://example.com/hidden-jetty.jpg",
      categorySlug: "beach",
      evidence,
    },
    { source: "actions-test", actorId: null },
    dbInstance,
  );

  trashListingForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "dorset",
      listingSlug: trashed.record.slug,
    },
    evidence,
    { source: "actions-test", actorId: null },
    dbInstance,
  );

  const searchResponse = await searchListingsHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/listings/search?query=Hidden%20Jetty"),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );
  const getResponse = await getListingHandler(
    authorizedRequest(`/api/actions/v1/countries/united-kingdom/regions/dorset/listings/${trashed.record.slug}`),
    { countrySlug: "united-kingdom", regionSlug: "dorset", listingSlug: trashed.record.slug },
    dbInstance,
  );

  const searchPayload = await readJson(searchResponse);

  assert.ok(
    !((searchPayload.candidates as Array<{ slug: string }> | undefined) ?? []).some(
      (candidate) => candidate.slug === trashed.record.slug,
    ),
  );
  assert.equal(getResponse.status, 404);
});

test("Actions listing create returns non-blocking warnings for weak out-of-scope lookalikes", async (t) => {
  const original = process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN;
  process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = token;
  t.after(() => {
    process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = original;
  });

  const dbInstance = createSeededTestDb(t);

  await createRegionHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions", {
      method: "POST",
      body: JSON.stringify({
        title: "Somerset",
        description: "Editorial region for Somerset coverage.",
        coverImage: "https://example.com/somerset.jpg",
        evidence,
      }),
    }),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );

  await createRegionHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions", {
      method: "POST",
      body: JSON.stringify({
        title: "Derbyshire",
        description: "Editorial region for Derbyshire coverage.",
        coverImage: "https://example.com/derbyshire.jpg",
        evidence,
      }),
    }),
    { countrySlug: "united-kingdom" },
    dbInstance,
  );

  createListingDraftForEditor(
    {
      countrySlug: "united-kingdom",
      regionSlug: "derbyshire",
      title: "Mam Tor",
      shortDescription: "Peak District hill listing for warning coverage.",
      description: "A cross-region listing used to verify non-blocking warning behavior.",
      latitude: 53.3492,
      longitude: -1.8093,
      busynessRating: 4,
      coverImage: "https://example.com/mam-tor.jpg",
      categorySlug: "viewpoint",
      evidence,
    },
    { source: "actions-test", actorId: null },
    dbInstance,
  );

  const response = await createListingHandler(
    authorizedRequest("/api/actions/v1/countries/united-kingdom/regions/somerset/listings", {
      method: "POST",
      body: JSON.stringify({
        title: "Glastonbury Tor",
        shortDescription: "A hilltop landmark above Glastonbury.",
        description: "A new Somerset draft used to verify non-blocking out-of-scope warnings.",
        latitude: 51.1456,
        longitude: -2.6877,
        busynessRating: 4,
        coverImage: "https://example.com/glastonbury-tor.jpg",
        categorySlug: "viewpoint",
        evidence,
      }),
    }),
    { countrySlug: "united-kingdom", regionSlug: "somerset" },
    dbInstance,
  );

  const payload = await readJson(response);

  assert.equal(response.status, 201);
  assert.equal(payload.status, "created");
  assert.ok(
    ((payload.warnings as string[] | undefined) ?? []).some(
      (warning) => warning.includes("Mam Tor") && warning.includes("Derbyshire"),
    ),
  );
});

test("OpenAPI contract includes the planned routes and consequential mutations", async (t) => {
  const original = process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN;
  process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = token;
  t.after(() => {
    process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN = original;
  });

  const response = await openApiHandler();
  const document = JSON.parse(await response.text()) as {
    paths: Record<string, Record<string, { operationId?: string; ["x-openai-isConsequential"]?: boolean }>>;
  };

  assert.ok(document.paths["/api/actions/v1/countries/{countrySlug}/regions"]);
  assert.equal(
    document.paths["/api/actions/v1/countries/{countrySlug}/regions"].post.operationId,
    "ensureRegion",
  );
  assert.equal(
    document.paths["/api/actions/v1/countries/{countrySlug}/regions"].post["x-openai-isConsequential"],
    true,
  );
  assert.equal(
    document.paths["/api/actions/v1/countries/{countrySlug}/regions/{regionSlug}/listings"].post.operationId,
    "ensureListingDraft",
  );
});

test("production OpenAPI contract is trimmed for ChatGPT import and points at explorersmap.org", async () => {
  const response = await openApiProductionHandler();
  const document = JSON.parse(await response.text()) as {
    servers: Array<{ url: string }>;
    paths: Record<string, unknown>;
  };

  assert.deepEqual(document.servers, [{ url: "https://explorersmap.org" }]);
  assert.ok(!document.paths["/api/actions/healthz"]);
  assert.ok(!document.paths["/api/actions/openapi.json"]);
  assert.ok(document.paths["/api/actions/v1/countries"]);
  assert.ok(document.paths["/api/actions/v1/countries/{countrySlug}/regions"]);
  assert.ok(document.paths["/api/actions/v1/countries/{countrySlug}/regions/{regionSlug}/listings"]);
});
