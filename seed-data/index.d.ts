export type SeedCountry = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};

export type SeedRegion = {
  id: string;
  countrySlug: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};

export type SeedDestination = {
  id: string;
  countrySlug: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
};

export type SeedDestinationRegion = {
  destinationSlug: string;
  regionSlug: string;
};

export type SeedCategory = {
  slug: string;
  title: string;
};

export type SeedTag = {
  id: string;
  slug: string;
  name: string;
};

export type SeedListing = {
  id: string;
  regionSlug: string;
  slug: string;
  status?: string;
  title: string;
  shortDescription: string;
  description: string;
  latitude: number;
  longitude: number;
  busynessRating: number;
  googleMapsPlaceUrl?: string;
  coverImage: string;
  categorySlug: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  source?: string;
  deletedAt?: string | null;
};

export type SeedListingDestination = {
  regionSlug: string;
  listingSlug: string;
  destinationSlug: string;
};

export type SeedListingImage = {
  id: string;
  regionSlug: string;
  listingSlug: string;
  imageUrl: string;
  sortOrder: number;
};

export type SeedListingTag = {
  regionSlug: string;
  listingSlug: string;
  tagSlug: string;
};

export type SeedData = {
  countries: SeedCountry[];
  regions: SeedRegion[];
  destinations: SeedDestination[];
  destinationRegions: SeedDestinationRegion[];
  categories: SeedCategory[];
  tags: SeedTag[];
  listings: SeedListing[];
  listingDestinations: SeedListingDestination[];
  listingImages: SeedListingImage[];
  listingTags: SeedListingTag[];
};

export const seedData: SeedData;
