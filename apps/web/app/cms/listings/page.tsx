import Link from "next/link";

import { listCountriesForCms, listListingsForCms, listManageableListingRegionOptions } from "@explorers-map/services";

import { EmptyState } from "../../../components/empty-state";
import { getCmsListingHref, getCmsNewListingHref } from "../../../lib/routes";
import { requireCmsActor } from "../../../lib/session";

type ListingFilters = {
  country?: string;
  region?: string;
  status?: string;
  trash?: string;
};

export default async function CmsListingsPage({
  searchParams,
}: {
  searchParams: Promise<ListingFilters>;
}) {
  const actor = await requireCmsActor("/cms/listings");
  const filters = await searchParams;
  const listings = listListingsForCms(actor);
  const countryOptions =
    actor.role === "admin"
      ? listCountriesForCms().map((country) => ({
          slug: country.slug,
          title: country.title,
        }))
      : Array.from(
          new Map(
            listManageableListingRegionOptions(actor).map((region) => [
              region.countrySlug,
              { slug: region.countrySlug, title: region.countryTitle },
            ]),
          ).values(),
        );
  const regionOptions = Array.from(
    new Map(
      listings
        .filter((listing) => !filters.country || filters.country === "all" || listing.countrySlug === filters.country)
        .map((listing) => [
          `${listing.countrySlug}::${listing.regionSlug}`,
          {
            value: `${listing.countrySlug}::${listing.regionSlug}`,
            label: listing.regionTitle,
          },
        ]),
    ).values(),
  );
  const filteredListings = listings.filter((listing) => {
    const matchesCountry = !filters.country || filters.country === "all" || listing.countrySlug === filters.country;
    const matchesRegion =
      !filters.region || filters.region === "all" || `${listing.countrySlug}::${listing.regionSlug}` === filters.region;
    const matchesStatus = !filters.status || filters.status === "all" || listing.status === filters.status;
    const matchesTrash =
      !filters.trash ||
      filters.trash === "all" ||
      (filters.trash === "active" ? listing.deletedAt === null : listing.deletedAt !== null);

    return matchesCountry && matchesRegion && matchesStatus && matchesTrash;
  });

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Listings</p>
          <h2 className="mt-3 font-serif text-3xl text-stone-950">Listing records</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            {actor.role === "admin"
              ? "Admins can create, edit, publish, unpublish, trash, and restore any listing."
              : "You can manage listings only inside your assigned regions, and destination edits stay scoped to the destinations you can manage."}
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          href={getCmsNewListingHref()}
        >
          Create listing
        </Link>
      </div>

      <form className="mt-8 grid gap-4 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5 md:grid-cols-5">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Country</span>
          <select
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500"
            defaultValue={filters.country ?? "all"}
            name="country"
          >
            <option value="all">All visible countries</option>
            {countryOptions.map((country) => (
              <option key={country.slug} value={country.slug}>
                {country.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Region</span>
          <select
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500"
            defaultValue={filters.region ?? "all"}
            name="region"
          >
            <option value="all">All visible regions</option>
            {regionOptions.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Status</span>
          <select
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500"
            defaultValue={filters.status ?? "all"}
            name="status"
          >
            <option value="all">Draft + published</option>
            <option value="draft">Draft only</option>
            <option value="published">Published only</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Trash</span>
          <select
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500"
            defaultValue={filters.trash ?? "all"}
            name="trash"
          >
            <option value="all">Active + trashed</option>
            <option value="active">Active only</option>
            <option value="trashed">Trashed only</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            className="inline-flex w-full items-center justify-center rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800"
            type="submit"
          >
            Apply filters
          </button>
        </div>
      </form>

      {filteredListings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            action={
              <Link
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                href={getCmsNewListingHref()}
              >
                Create listing
              </Link>
            }
            description={
              filters.country && filters.country !== "all"
                ? "No listings match the current country and lifecycle filters yet. Listing records only appear after a listing is created inside one of that country's regions."
                : "No listings match the current filters yet. Create one to start shaping the editorial catalog for your managed regions."
            }
            title="No listings yet"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {filteredListings.map((listing) => (
            <Link
              key={listing.id}
              className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5 transition hover:border-sky-300 hover:bg-sky-50"
              href={getCmsListingHref(listing.countrySlug, listing.regionSlug, listing.slug)}
            >
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={listing.deletedAt ? "rose" : listing.status === "published" ? "emerald" : "stone"}>
                  {listing.deletedAt ? "Trashed" : listing.status}
                </StatusPill>
                <StatusPill tone="sky">{listing.regionTitle}</StatusPill>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{listing.countryTitle}</p>
              <h3 className="mt-3 font-serif text-2xl text-stone-950">{listing.title}</h3>
              <p className="mt-2 text-sm text-stone-500">{listing.slug}</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{listing.shortDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.destinations.map((destination) => (
                  <span
                    key={destination.destinationId}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      destination.manageableByActor
                        ? "border-sky-200 bg-sky-50 text-sky-950"
                        : "border-stone-300 bg-white text-stone-700"
                    }`}
                  >
                    {destination.destinationTitle}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "emerald" | "rose" | "sky" | "stone";
}) {
  const className = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    sky: "border-sky-200 bg-sky-50 text-sky-950",
    stone: "border-stone-300 bg-white text-stone-700",
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${className}`}>{children}</span>;
}
