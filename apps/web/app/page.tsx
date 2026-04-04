import Link from "next/link";

import { listCountries } from "@explorers-map/services";

import { ImageCard } from "../components/image-card";
import { PageHero } from "../components/page-hero";
import { SectionHeading } from "../components/section-heading";
import { buildMetadata } from "../lib/metadata";
import { getCountriesHref, getCountryHref, siteName } from "../lib/routes";

export const metadata = buildMetadata({
  title: siteName,
  description:
    "Start with a country, then move through regions, destinations, and hand-picked outdoor places worth exploring.",
});

export const dynamic = "force-dynamic";

export default function HomePage() {
  const countries = listCountries();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHero
        eyebrow="Curated outdoor discovery"
        title="Browse standout places the calm way"
        description="Explorers Map is built for visual discovery. Start with a country, drift into regions or named destinations, and open detailed pages for places worth exploring."
        image={countries[0]?.coverImage ?? "https://picsum.photos/seed/explorers-map-home/1600/900"}
        badges={[
          { label: "Visual first", tone: "muted" },
          { label: "Read only MVP", tone: "muted" },
          { label: "Country-led browsing", tone: "warm" },
        ]}
        actions={
          <>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              href={getCountriesHref()}
            >
              Explore countries
            </Link>
            {countries[0] ? (
              <Link
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                href={getCountryHref(countries[0].slug)}
              >
                Open {countries[0].title}
              </Link>
            ) : null}
          </>
        }
      />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Start here"
          title="Countries ready to explore"
          description="The first public pass is intentionally focused: move through a country, browse its regions and destinations, then open canonical listing pages under regions."
          action={
            <Link className="text-sm font-semibold text-emerald-800 transition hover:text-emerald-950" href={getCountriesHref()}>
              View all countries
            </Link>
          }
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
      </section>
    </main>
  );
}
