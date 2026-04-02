export const siteName = "Explorers Map";
export const siteDescription =
  "A calm, visual guide to standout outdoor places, from dramatic coastlines to quiet trails and named destinations worth exploring.";

export function getCountryHref(countrySlug: string) {
  return `/countries/${countrySlug}`;
}

export function getCountriesHref() {
  return "/countries";
}

export function getCountryRegionsHref(countrySlug: string) {
  return `/countries/${countrySlug}/regions`;
}

export function getCountryDestinationsHref(countrySlug: string) {
  return `/countries/${countrySlug}/destinations`;
}

export function getRegionHref(countrySlug: string, regionSlug: string) {
  return `/countries/${countrySlug}/regions/${regionSlug}`;
}

export function getRegionListingsHref(countrySlug: string, regionSlug: string) {
  return `/countries/${countrySlug}/regions/${regionSlug}/listings`;
}

export function getRegionDestinationsHref(countrySlug: string, regionSlug: string) {
  return `/countries/${countrySlug}/regions/${regionSlug}/destinations`;
}

export function getDestinationHref(countrySlug: string, destinationSlug: string) {
  return `/countries/${countrySlug}/destinations/${destinationSlug}`;
}

export function getListingHref(countrySlug: string, regionSlug: string, listingSlug: string) {
  return `/countries/${countrySlug}/regions/${regionSlug}/${listingSlug}`;
}

export function getBusynessLabel(rating: number) {
  const labels = {
    1: "Very quiet",
    2: "Usually calm",
    3: "Steady",
    4: "Popular",
    5: "Very busy",
  } as const;

  return labels[rating as keyof typeof labels] ?? `Busyness ${rating}/5`;
}
