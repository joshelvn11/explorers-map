import { notFound } from "next/navigation";

import { getRegionListingCatalog } from "@explorers-map/services";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { CatalogFilters } from "../../../../../../components/catalog-filters";
import { EmptyState } from "../../../../../../components/empty-state";
import { ListingGrid } from "../../../../../../components/listing-card";
import { PageHero } from "../../../../../../components/page-hero";
import { buildMetadata } from "../../../../../../lib/metadata";
import {
  getCountriesHref,
  getCountryHref,
  getCountryRegionsHref,
  getListingHref,
  getRegionHref,
  getRegionListingsHref,
} from "../../../../../../lib/routes";
import { getOptionalIntegerSearchParam, getSingleSearchParam, type RouteSearchParams } from "../../../../../../lib/search";

type RegionListingsPageProps = {
  params: Promise<{ countrySlug: string; regionSlug: string }>;
  searchParams: Promise<RouteSearchParams>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: RegionListingsPageProps) {
  const { countrySlug, regionSlug } = await params;
  const catalog = getRegionListingCatalog({ countrySlug, regionSlug });

  if (!catalog) {
    return buildMetadata({
      title: "Catalog not found",
      description: "This region catalog is not publicly available.",
    });
  }

  return buildMetadata({
    title: `${catalog.region.title} Listings`,
    description: `Browse published listings in ${catalog.region.title}, with category, tag, destination, and busyness filters.`,
    image: catalog.region.coverImage,
  });
}

export default async function RegionListingsPage({ params, searchParams }: RegionListingsPageProps) {
  const { countrySlug, regionSlug } = await params;
  const filters = await searchParams;
  const catalog = getRegionListingCatalog(
    { countrySlug, regionSlug },
    {
      categorySlug: getSingleSearchParam(filters.category),
      tagSlug: getSingleSearchParam(filters.tag),
      destinationSlug: getSingleSearchParam(filters.destination),
      busynessRating: getOptionalIntegerSearchParam(filters.busyness),
    },
  );

  if (!catalog) {
    notFound();
  }

  const pathname = getRegionListingsHref(countrySlug, regionSlug);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Countries", href: getCountriesHref() },
          { label: catalog.region.country.title, href: getCountryHref(catalog.region.country.slug) },
          { label: "Regions", href: getCountryRegionsHref(catalog.region.country.slug) },
          { label: catalog.region.title, href: getRegionHref(countrySlug, regionSlug) },
          { label: "Listings" },
        ]}
      />
      <PageHero
        eyebrow="Region catalog"
        title={`Published places in ${catalog.region.title}`}
        description="This is the interactive catalog surface in the MVP. Filters stay URL-driven, while listing pages remain canonically nested under regions."
        image={catalog.region.coverImage}
        badges={[
          { label: `${catalog.listings.length} results`, tone: "warm" },
          { label: `${catalog.facets.categories.length} categories`, tone: "muted" },
          { label: `${catalog.facets.destinations.length} destinations`, tone: "muted" },
        ]}
      />
      <CatalogFilters pathname={pathname} catalog={catalog} />
      {catalog.listings.length > 0 ? (
        <ListingGrid
          items={catalog.listings.map((listing) => ({
            listing,
            href: getListingHref(countrySlug, regionSlug, listing.slug),
          }))}
        />
      ) : (
        <EmptyState
          title="No listings match these filters"
          description={`Try resetting the filters or exploring ${catalog.region.title} from a broader view.`}
        />
      )}
    </main>
  );
}
