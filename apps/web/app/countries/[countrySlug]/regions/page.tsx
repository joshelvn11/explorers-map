import { notFound } from "next/navigation";

import { getCountryBySlug, listRegionsForCountry } from "@explorers-map/services";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { EmptyState } from "../../../../components/empty-state";
import { ImageCard } from "../../../../components/image-card";
import { PageHero } from "../../../../components/page-hero";
import { buildMetadata } from "../../../../lib/metadata";
import { getCountriesHref, getCountryHref, getRegionHref } from "../../../../lib/routes";

type CountryRegionsPageProps = {
  params: Promise<{ countrySlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CountryRegionsPageProps) {
  const { countrySlug } = await params;
  const country = getCountryBySlug(countrySlug);

  if (!country) {
    return buildMetadata({
      title: "Regions not found",
      description: "This country is not publicly available.",
    });
  }

  return buildMetadata({
    title: `${country.title} Regions`,
    description: `Browse the published regions currently available for ${country.title}.`,
    image: country.coverImage,
  });
}

export default async function CountryRegionsPage({ params }: CountryRegionsPageProps) {
  const { countrySlug } = await params;
  const country = getCountryBySlug(countrySlug);

  if (!country) {
    notFound();
  }

  const regions = listRegionsForCountry(countrySlug);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Breadcrumbs
        items={[
          { label: "Countries", href: getCountriesHref() },
          { label: country.title, href: getCountryHref(country.slug) },
          { label: "Regions" },
        ]}
      />
      <PageHero
        eyebrow="Regions"
        title={`Browse ${country.title} by region`}
        description="Region pages are the clearest way to open the public listing catalog, with listing detail pages staying canonically nested underneath."
        image={country.coverImage}
        badges={[{ label: `${regions.length} public regions`, tone: "muted" }]}
      />
      {regions.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {regions.map((region) => (
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
          title="No public regions yet"
          description={`The ${country.title} page exists, but no public region pages have been published yet.`}
        />
      )}
    </main>
  );
}
