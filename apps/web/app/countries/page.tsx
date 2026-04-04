import { listCountries } from "@explorers-map/services";

import { ImageCard } from "../../components/image-card";
import { PageHero } from "../../components/page-hero";
import { buildMetadata } from "../../lib/metadata";
import { getCountryHref } from "../../lib/routes";

export const metadata = buildMetadata({
  title: "Countries",
  description: "Browse the countries currently available in Explorers Map.",
});

export const dynamic = "force-dynamic";

export default function CountriesPage() {
  const countries = listCountries();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHero
        eyebrow="Countries"
        title="Choose a country to start exploring"
        description="Each country page branches into regions and named destinations, keeping the browsing experience structured and light."
        image={countries[0]?.coverImage ?? "https://picsum.photos/seed/explorers-map-countries/1600/900"}
        badges={[{ label: `${countries.length} country${countries.length === 1 ? "" : "ies"}` }]}
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {countries.map((country) => (
          <ImageCard
            key={country.slug}
            href={getCountryHref(country.slug)}
            image={country.coverImage}
            eyebrow="Country"
            title={country.title}
            description={country.description}
          />
        ))}
      </div>
    </main>
  );
}
