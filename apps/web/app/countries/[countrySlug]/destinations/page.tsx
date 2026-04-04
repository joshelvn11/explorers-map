import { notFound } from "next/navigation";

import { getCountryBySlug, listDestinationsForCountry } from "@explorers-map/services";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { EmptyState } from "../../../../components/empty-state";
import { ImageCard } from "../../../../components/image-card";
import { PageHero } from "../../../../components/page-hero";
import { buildMetadata } from "../../../../lib/metadata";
import { getCountriesHref, getCountryHref, getDestinationHref } from "../../../../lib/routes";

type CountryDestinationsPageProps = {
  params: Promise<{ countrySlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CountryDestinationsPageProps) {
  const { countrySlug } = await params;
  const country = getCountryBySlug(countrySlug);

  if (!country) {
    return buildMetadata({
      title: "Destinations not found",
      description: "This country is not publicly available.",
    });
  }

  return buildMetadata({
    title: `${country.title} Destinations`,
    description: `Browse named destinations currently available for ${country.title}.`,
    image: country.coverImage,
  });
}

export default async function CountryDestinationsPage({ params }: CountryDestinationsPageProps) {
  const { countrySlug } = await params;
  const country = getCountryBySlug(countrySlug);

  if (!country) {
    notFound();
  }

  const destinations = listDestinationsForCountry(countrySlug);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Countries", href: getCountriesHref() },
          { label: country.title, href: getCountryHref(country.slug) },
          { label: "Destinations" },
        ]}
      />
      <PageHero
        eyebrow="Destinations"
        title={`Named destinations in ${country.title}`}
        description="Destination pages are curated discovery surfaces. They only show listings that have been explicitly linked to that destination."
        image={country.coverImage}
        badges={[{ label: `${destinations.length} public destinations`, tone: "muted" }]}
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
          title="No public destinations yet"
          description={`The ${country.title} page is live, but it does not currently have any published destination pages.`}
        />
      )}
    </main>
  );
}
