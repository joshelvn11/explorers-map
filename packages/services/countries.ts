import { asc, eq } from "drizzle-orm";

import { countries, regions, type DbInstance } from "@explorers-map/db";

import { resolveCountryRecord, resolveDb, resolveRegionRecord, type RegionLocator } from "./shared.ts";

export type CountrySummary = {
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};

export type CountryDetail = CountrySummary;

export type RegionSummary = {
  countrySlug: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};

export type RegionDetail = RegionSummary & {
  country: CountrySummary;
};

export function listCountries(dbInstance?: DbInstance): CountrySummary[] {
  const { db } = resolveDb(dbInstance);

  return db
    .select({
      slug: countries.slug,
      title: countries.title,
      description: countries.description,
      coverImage: countries.coverImage,
    })
    .from(countries)
    .orderBy(asc(countries.title))
    .all();
}

export function getCountryBySlug(countrySlug: string, dbInstance?: DbInstance): CountryDetail | null {
  const { db } = resolveDb(dbInstance);
  const country = resolveCountryRecord(db, countrySlug);

  if (!country) {
    return null;
  }

  return {
    slug: country.slug,
    title: country.title,
    description: country.description,
    coverImage: country.coverImage,
  };
}

export function listRegionsForCountry(countrySlug: string, dbInstance?: DbInstance): RegionSummary[] {
  const { db } = resolveDb(dbInstance);
  const country = resolveCountryRecord(db, countrySlug);

  if (!country) {
    return [];
  }

  return db
    .select({
      countrySlug: countries.slug,
      slug: regions.slug,
      title: regions.title,
      description: regions.description,
      coverImage: regions.coverImage,
    })
    .from(regions)
    .innerJoin(countries, eq(regions.countryId, countries.id))
    .where(eq(countries.slug, country.slug))
    .orderBy(asc(regions.title))
    .all();
}

export function getRegionBySlug(locator: RegionLocator, dbInstance?: DbInstance): RegionDetail | null {
  const { db } = resolveDb(dbInstance);
  const region = resolveRegionRecord(db, locator);

  if (!region) {
    return null;
  }

  return {
    countrySlug: region.countrySlug,
    slug: region.slug,
    title: region.title,
    description: region.description,
    coverImage: region.coverImage,
    country: {
      slug: region.countrySlug,
      title: region.countryTitle,
      description: region.countryDescription,
      coverImage: region.countryCoverImage,
    },
  };
}
