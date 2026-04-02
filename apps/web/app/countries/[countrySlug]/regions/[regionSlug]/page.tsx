import Link from "next/link";
import { notFound } from "next/navigation";

import { getRegionBySlug, listCountries, listListingsForRegion, listRegionsForCountry } from "@explorers-map/services";

import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { ListingGrid } from "../../../../../components/listing-card";
import { PageHero } from "../../../../../components/page-hero";
import { SectionHeading } from "../../../../../components/section-heading";
import { buildMetadata } from "../../../../../lib/metadata";
import {
  getCountriesHref,
  getCountryHref,
  getCountryRegionsHref,
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
    </main>
  );
}
