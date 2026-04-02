import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getRegionBySlug,
  listCountries,
  listDestinationsForRegion,
  listListingsForRegion,
  listRegionsForCountry,
} from "@explorers-map/services";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { ImageCard } from "../../../../../components/image-card";
import { ListingGrid } from "../../../../../components/listing-card";
import { PageHero } from "../../../../../components/page-hero";
import { SectionHeading } from "../../../../../components/section-heading";
import { buildMetadata } from "../../../../../lib/metadata";
import {
  getCountriesHref,
  getCountryHref,
  getCountryRegionsHref,
  getDestinationHref,
  getRegionDestinationsHref,
  getListingHref,
  getRegionHref,
  getRegionListingsHref,
} from "../../../../../lib/routes";

type RegionPageProps = {
  params: Promise<{ countrySlug: string; regionSlug: string }>;
};

export async function generateStaticParams() {
  return listCountries().flatMap((country) =>
    listRegionsForCountry(country.slug).map((region) => ({
      countrySlug: country.slug,
      regionSlug: region.slug,
    })),
  );
}

export async function generateMetadata({ params }: RegionPageProps) {
  const { countrySlug, regionSlug } = await params;
  const region = getRegionBySlug({ countrySlug, regionSlug });

  if (!region) {
    return buildMetadata({
      title: "Region not found",
      description: "This region is not publicly available.",
    });
  }

  return buildMetadata({
    title: `${region.title}, ${region.country.title}`,
    description: region.description,
    image: region.coverImage,
  });
}

export default async function RegionPage({ params }: RegionPageProps) {
  const { countrySlug, regionSlug } = await params;
  const region = getRegionBySlug({ countrySlug, regionSlug });

  if (!region) {
    notFound();
  }

  const listings = listListingsForRegion({ countrySlug, regionSlug });
  const destinations = listDestinationsForRegion({ countrySlug, regionSlug });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Countries", href: getCountriesHref() },
          { label: region.country.title, href: getCountryHref(region.country.slug) },
          { label: "Regions", href: getCountryRegionsHref(region.country.slug) },
          { label: region.title },
        ]}
      />
      <PageHero
        eyebrow="Region overview"
        title={region.title}
        description={region.description}
        image={region.coverImage}
        badges={[
          { label: region.country.title, tone: "muted" },
          { label: `${listings.length} published listings`, tone: "warm" },
        ]}
        actions={
          <Link
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            href={getRegionListingsHref(countrySlug, regionSlug)}
          >
            Open full catalog
          </Link>
        }
      />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Published listings"
          title={`Places currently published in ${region.title}`}
          description="A smaller preview of the region catalog. Open the full catalog to use filters for categories, tags, destinations, and busyness."
          action={
            <Link className="text-sm font-semibold text-emerald-800 transition hover:text-emerald-950" href={getRegionListingsHref(countrySlug, regionSlug)}>
              View full catalog
            </Link>
          }
        />
        {listings.length > 0 ? (
          <ListingGrid
            items={listings.slice(0, 3).map((listing) => ({
              listing,
              href: getListingHref(countrySlug, regionSlug, listing.slug),
            }))}
          />
        ) : (
          <EmptyState
            title="No listings are published in this region yet"
            description="The region page is ready, but the public catalog is still waiting on published places."
            action={
              <Link
                className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
                href={getRegionHref(countrySlug, regionSlug)}
              >
                Stay on region overview
              </Link>
            }
          />
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Linked destinations"
          title={`Destinations connected to ${region.title}`}
          description="These destination pages include this region as part of their editorial discovery area, giving visitors another way to browse related places."
          action={
            <Link
              className="text-sm font-semibold text-emerald-800 transition hover:text-emerald-950"
              href={getRegionDestinationsHref(countrySlug, regionSlug)}
            >
              View all destinations
            </Link>
          }
        />
        {destinations.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {destinations.slice(0, 3).map((destination) => (
              <ImageCard
                key={destination.slug}
                href={getDestinationHref(destination.countrySlug, destination.slug)}
                image={destination.coverImage}
                eyebrow="Destination"
                title={destination.title}
                description={destination.description}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No destinations are linked to this region yet"
            description="The region page can still stand on its own, but there are not any public destination pages connected to it right now."
          />
        )}
      </section>
    </main>
  );
}
