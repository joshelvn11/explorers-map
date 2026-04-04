import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getListingDetail,
} from "@explorers-map/services";

import { Badge } from "../../../../../../components/badge";
import { Breadcrumbs } from "../../../../../../components/breadcrumbs";
import { buildMetadata } from "../../../../../../lib/metadata";
import { getPreferredMapHref } from "../../../../../../lib/maps";
import {
  getBusynessLabel,
  getCountriesHref,
  getCountryHref,
  getCountryRegionsHref,
  getDestinationHref,
  getRegionHref,
  getRegionListingsHref,
} from "../../../../../../lib/routes";

type ListingPageProps = {
  params: Promise<{ countrySlug: string; regionSlug: string; listingSlug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ListingPageProps) {
  const { countrySlug, regionSlug, listingSlug } = await params;
  const listing = getListingDetail({ countrySlug, regionSlug, listingSlug });

  if (!listing) {
    return buildMetadata({
      title: "Listing not found",
      description: "This listing is not publicly available.",
    });
  }

  return buildMetadata({
    title: `${listing.title}, ${listing.region.title}`,
    description: listing.shortDescription,
    image: listing.coverImage,
  });
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { countrySlug, regionSlug, listingSlug } = await params;
  const listing = getListingDetail({ countrySlug, regionSlug, listingSlug });

  if (!listing) {
    notFound();
  }

  const mapHref = getPreferredMapHref(listing);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Breadcrumbs
          items={[
            { label: "Countries", href: getCountriesHref() },
            { label: listing.country.title, href: getCountryHref(listing.country.slug) },
            { label: "Regions", href: getCountryRegionsHref(listing.country.slug) },
            { label: listing.region.title, href: getRegionHref(countrySlug, regionSlug) },
            { label: "Listings", href: getRegionListingsHref(countrySlug, regionSlug) },
            { label: listing.title },
          ]}
        />
        <Link
          className="inline-flex items-center justify-center self-start rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
          href={getRegionListingsHref(countrySlug, regionSlug)}
        >
          Return to catalog
        </Link>
      </div>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="space-y-6">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-stone-200 shadow-[0_25px_70px_rgba(28,25,23,0.16)]">
            <Image
              src={listing.coverImage}
              alt={listing.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </div>
          {listing.images.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {listing.images.map((image) => (
                <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-stone-200">
                  <Image
                    src={image.imageUrl}
                    alt={`${listing.title} gallery image ${image.sortOrder}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 30vw"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-stone-500">{listing.region.title}</p>
            <h1 className="mt-3 font-serif text-4xl text-stone-950">{listing.title}</h1>
            <p className="mt-4 text-base leading-8 text-stone-600">{listing.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge>{listing.category.title}</Badge>
              <Badge tone="warm">{getBusynessLabel(listing.busynessRating)}</Badge>
              {listing.tags.map((tag) => (
                <Badge key={tag.slug} tone="muted">
                  {tag.name}
                </Badge>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-800"
                href={mapHref}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-sm">
            <h2 className="font-serif text-2xl text-stone-950">Details</h2>
            <dl className="mt-4 grid gap-4 text-sm text-stone-700">
              <div>
                <dt className="text-xs font-semibold tracking-[0.28em] uppercase text-stone-500">Coordinates</dt>
                <dd className="mt-2">{listing.latitude.toFixed(4)}, {listing.longitude.toFixed(4)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.28em] uppercase text-stone-500">Busyness</dt>
                <dd className="mt-2">{getBusynessLabel(listing.busynessRating)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-[0.28em] uppercase text-stone-500">Destinations</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {listing.destinations.length > 0 ? (
                    listing.destinations.map((destination) => (
                      <Link
                        key={destination.slug}
                        className="rounded-full bg-stone-100 px-3 py-1.5 font-medium text-stone-700 transition hover:bg-stone-200 hover:text-stone-950"
                        href={getDestinationHref(countrySlug, destination.slug)}
                      >
                        {destination.title}
                      </Link>
                    ))
                  ) : (
                    <span>This listing is not linked to a destination page.</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
