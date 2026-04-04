import { notFound } from "next/navigation";

import {
  getRegionBySlug,
  listDestinationsForRegion,
} from "@explorers-map/services";

import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../../components/empty-state";
import { ImageCard } from "../../../../../../components/image-card";
import { PageHero } from "../../../../../../components/page-hero";
import { buildMetadata } from "../../../../../../lib/metadata";
import {
  getCountriesHref,
  getCountryHref,
  getCountryRegionsHref,
  getDestinationHref,
  getRegionHref,
} from "../../../../../../lib/routes";

type RegionDestinationsPageProps = {
  params: Promise<{ countrySlug: string; regionSlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: RegionDestinationsPageProps) {
  const { countrySlug, regionSlug } = await params;
  const region = getRegionBySlug({ countrySlug, regionSlug });

  if (!region) {
    return buildMetadata({
      title: "Region destinations not found",
      description: "This region is not publicly available.",
    });
  }

  return buildMetadata({
    title: `${region.title} Destinations`,
    description: `Browse public destination pages linked to ${region.title}.`,
    image: region.coverImage,
  });
}

export default async function RegionDestinationsPage({ params }: RegionDestinationsPageProps) {
  const { countrySlug, regionSlug } = await params;
  const region = getRegionBySlug({ countrySlug, regionSlug });

  if (!region) {
    notFound();
  }

  const destinations = listDestinationsForRegion({ countrySlug, regionSlug });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Countries", href: getCountriesHref() },
          { label: region.country.title, href: getCountryHref(region.country.slug) },
          { label: "Regions", href: getCountryRegionsHref(region.country.slug) },
          { label: region.title, href: getRegionHref(countrySlug, regionSlug) },
          { label: "Destinations" },
        ]}
      />
      <PageHero
        eyebrow="Region destinations"
        title={`Destinations linked to ${region.title}`}
        description="These destination pages include this region as part of their editorial discovery area, giving visitors another browse path without changing listing canonicals."
        image={region.coverImage}
        badges={[
          { label: region.country.title, tone: "muted" },
          { label: `${destinations.length} linked destinations`, tone: "warm" },
        ]}
      />
      {destinations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {destinations.map((destination) => (
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
    </main>
  );
}
