import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCountryBySlug,
  listDestinationsForCountry,
  listRegionsForCountry,
} from "@explorers-map/services";

import { Breadcrumbs } from "../../../components/breadcrumbs";
import { EmptyState } from "../../../components/empty-state";
import { ImageCard } from "../../../components/image-card";
import { PageHero } from "../../../components/page-hero";
import { SectionHeading } from "../../../components/section-heading";
import { buildMetadata } from "../../../lib/metadata";
import {
  getCountriesHref,
  getCountryDestinationsHref,
  getCountryRegionsHref,
  getDestinationHref,
  getRegionHref,
} from "../../../lib/routes";

type CountryPageProps = {
  params: Promise<{ countrySlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CountryPageProps) {
  const { countrySlug } = await params;
  const country = getCountryBySlug(countrySlug);

  if (!country) {
    return buildMetadata({
      title: "Country not found",
      description: "This country is not publicly available.",
    });
  }

  return buildMetadata({
    title: country.title,
    description: country.description,
    image: country.coverImage,
  });
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { countrySlug } = await params;
  const country = getCountryBySlug(countrySlug);

  if (!country) {
    notFound();
  }

  const regions = listRegionsForCountry(countrySlug);
  const destinations = listDestinationsForCountry(countrySlug);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Countries", href: getCountriesHref() },
          { label: country.title },
        ]}
      />
      <PageHero
        eyebrow="Country hub"
        title={country.title}
        description={country.description}
        image={country.coverImage}
        badges={[
          { label: `${regions.length} regions`, tone: "muted" },
          { label: `${destinations.length} destinations`, tone: "muted" },
        ]}
        actions={
          <>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              href={getCountryRegionsHref(country.slug)}
            >
              Browse regions
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              href={getCountryDestinationsHref(country.slug)}
            >
              Browse destinations
            </Link>
          </>
        }
      />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Regions"
          title={`Explore ${country.title} by region`}
          description="Regions are the canonical parent for listings, so this is the strongest starting point when you want to browse the catalog directly."
          action={
            <Link className="text-sm font-semibold text-emerald-800 transition hover:text-emerald-950" href={getCountryRegionsHref(country.slug)}>
              View all regions
            </Link>
          }
        />
        {regions.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {regions.slice(0, 3).map((region) => (
              <ImageCard
                key={region.slug}
                href={getRegionHref(region.countrySlug, region.slug)}
                image={region.coverImage}
                eyebrow="Region"
                title={region.title}
                description={region.description}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No regions are published yet"
            description="This country exists, but its public region pages have not been filled out yet."
          />
        )}
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Destinations"
          title={`Named destinations in ${country.title}`}
          description="Destinations are editorial discovery surfaces that group explicitly linked places without becoming their canonical parent."
          action={
            <Link className="text-sm font-semibold text-emerald-800 transition hover:text-emerald-950" href={getCountryDestinationsHref(country.slug)}>
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
            title="No destinations are published yet"
            description="This country exists, but it does not have any named destination pages in the public app yet."
          />
        )}
      </section>
    </main>
  );
}
