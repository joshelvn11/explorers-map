import { notFound } from "next/navigation";

import {
  getDestinationBySlug,
  listListingsForDestination,
} from "@explorers-map/services";

import { Badge } from "../../../../../components/badge";
import { Breadcrumbs } from "../../../../../components/breadcrumbs";
import { EmptyState } from "../../../../../components/empty-state";
import { ListingGrid } from "../../../../../components/listing-card";
import { PageHero } from "../../../../../components/page-hero";
import { buildMetadata } from "../../../../../lib/metadata";
import {
  getCountriesHref,
  getCountryDestinationsHref,
  getCountryHref,
  getListingHref,
} from "../../../../../lib/routes";

type DestinationPageProps = {
  params: Promise<{ countrySlug: string; destinationSlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: DestinationPageProps) {
  const { countrySlug, destinationSlug } = await params;
  const destination = getDestinationBySlug({ countrySlug, destinationSlug });

  if (!destination) {
    return buildMetadata({
      title: "Destination not found",
      description: "This destination is not publicly available.",
    });
  }

  return buildMetadata({
    title: `${destination.title}, ${destination.country.title}`,
    description: destination.description,
    image: destination.coverImage,
  });
}

export default async function DestinationPage({ params }: DestinationPageProps) {
  const { countrySlug, destinationSlug } = await params;
  const destination = getDestinationBySlug({ countrySlug, destinationSlug });

  if (!destination) {
    notFound();
  }

  const listings = listListingsForDestination({ countrySlug, destinationSlug });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Countries", href: getCountriesHref() },
          { label: destination.country.title, href: getCountryHref(destination.country.slug) },
          { label: "Destinations", href: getCountryDestinationsHref(destination.country.slug) },
          { label: destination.title },
        ]}
      />
      <PageHero
        eyebrow="Destination"
        title={destination.title}
        description={destination.description}
        image={destination.coverImage}
        badges={[
          { label: `${destination.regions.length} linked regions`, tone: "muted" },
          { label: `${listings.length} explicit listing links`, tone: "warm" },
        ]}
      />

      {destination.regions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {destination.regions.map((region) => (
            <Badge key={region.slug} tone="muted">
              {region.title}
            </Badge>
          ))}
        </div>
      ) : null}

      {listings.length > 0 ? (
        <ListingGrid
          items={listings.map((listing) => ({
            listing,
            href: getListingHref(countrySlug, listing.region.slug, listing.slug),
            eyebrow: `${destination.title} • ${listing.region.title}`,
          }))}
        />
      ) : (
        <EmptyState
          title="No public listings are linked to this destination"
          description="Destination pages only show explicitly linked listings, so this one will stay empty until those links are added in shared content operations."
        />
      )}
    </main>
  );
}
