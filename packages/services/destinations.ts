import { asc, eq } from "drizzle-orm";

import { countries, destinations, type DbInstance } from "@explorers-map/db";

import {
  loadDestinationRegions,
  resolveDb,
  resolveDestinationRecord,
  type DestinationLocator,
} from "./shared.ts";

export type DestinationRegionSummary = {
  slug: string;
  title: string;
};

export type DestinationSummary = {
  countrySlug: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};

export type DestinationDetail = DestinationSummary & {
  country: {
    slug: string;
    title: string;
    description: string;
    coverImage: string;
  };
  regions: DestinationRegionSummary[];
};

export function listDestinationsForCountry(countrySlug: string, dbInstance?: DbInstance): DestinationSummary[] {
  const { db } = resolveDb(dbInstance);
  const destinationCountry = resolveDestinationCountry(countrySlug, dbInstance);

  if (!destinationCountry) {
    return [];
  }

  return db
    .select({
      countrySlug: countries.slug,
      slug: destinations.slug,
      title: destinations.title,
      description: destinations.description,
      coverImage: destinations.coverImage,
    })
    .from(destinations)
    .innerJoin(countries, eq(destinations.countryId, countries.id))
    .where(eq(countries.slug, destinationCountry.slug))
    .orderBy(asc(destinations.title))
    .all();
}

export function getDestinationBySlug(locator: DestinationLocator, dbInstance?: DbInstance): DestinationDetail | null {
  const { db } = resolveDb(dbInstance);
  const destination = resolveDestinationRecord(db, locator);

  if (!destination) {
    return null;
  }

  return {
    countrySlug: destination.countrySlug,
    slug: destination.slug,
    title: destination.title,
    description: destination.description,
    coverImage: destination.coverImage,
    country: {
      slug: destination.countrySlug,
      title: destination.countryTitle,
      description: destination.countryDescription,
      coverImage: destination.countryCoverImage,
    },
    regions: loadDestinationRegions(db, destination.id),
  };
}

function resolveDestinationCountry(countrySlug: string, dbInstance?: DbInstance) {
  const { db } = resolveDb(dbInstance);
  const [country] = db
    .select({
      slug: countries.slug,
    })
    .from(countries)
    .where(eq(countries.slug, countrySlug))
    .limit(1)
    .all();

  return country ?? null;
}
