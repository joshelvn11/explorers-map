import Link from "next/link";

import { listCountriesForCms, listRegionsForCms } from "@explorers-map/services";

import { EmptyState } from "../../../components/empty-state";
import { getCmsNewRegionHref, getCmsRegionHref } from "../../../lib/routes";
import { requireCountryModeratorActor } from "../../../lib/session";

type RegionFilters = {
  country?: string;
};

export default async function CmsRegionsPage({
  searchParams,
}: {
  searchParams: Promise<RegionFilters>;
}) {
  const actor = await requireCountryModeratorActor("/cms/regions");
  const filters = await searchParams;
  const countries = listCountriesForCms(actor).map((country) => ({
    slug: country.slug,
    title: country.title,
  }));
  const regions = listRegionsForCms(actor);
  const filteredRegions = regions.filter(
    (region) => !filters.country || filters.country === "all" || region.countrySlug === filters.country,
  );

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Regions</p>
          <h2 className="mt-3 font-serif text-3xl text-stone-950">Region records</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            Regions stay tied to a single parent country. Country reassignment is still intentionally deferred.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          href={getCmsNewRegionHref()}
        >
          Create region
        </Link>
      </div>

      <form className="mt-8 grid gap-4 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Country</span>
          <select
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500"
            defaultValue={filters.country ?? "all"}
            name="country"
          >
            <option value="all">All manageable countries</option>
            {countries.map((country) => (
              <option key={country.slug} value={country.slug}>
                {country.title}
              </option>
            ))}
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

      {filteredRegions.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            action={
              <Link
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                href={getCmsNewRegionHref()}
              >
                Create region
              </Link>
            }
            description={
              filters.country && filters.country !== "all"
                ? "No regions match the current country filter yet."
                : "No regions exist yet in your current management scope."
            }
            title="No regions yet"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {filteredRegions.map((region) => (
            <Link
              key={region.id}
              className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5 transition hover:border-sky-300 hover:bg-sky-50"
              href={getCmsRegionHref(region.countrySlug, region.slug)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{region.countryTitle}</p>
              <h3 className="mt-3 font-serif text-2xl text-stone-950">{region.title}</h3>
              <p className="mt-2 text-sm text-stone-500">{region.slug}</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{region.description}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
