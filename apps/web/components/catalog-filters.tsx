import Link from "next/link";

import type { RegionListingCatalogResult } from "@explorers-map/services";

import { getBusynessLabel } from "../lib/routes";
import { Badge } from "./badge";

type CatalogFiltersProps = {
  pathname: string;
  catalog: RegionListingCatalogResult;
};

export function CatalogFilters({ pathname, catalog }: CatalogFiltersProps) {
  const { appliedFilters, facets } = catalog;
  const activeCategory = facets.categories.find((facet) => facet.slug === appliedFilters.categorySlug);
  const activeTag = facets.tags.find((facet) => facet.slug === appliedFilters.tagSlug);
  const activeDestination = facets.destinations.find((facet) => facet.slug === appliedFilters.destinationSlug);

  return (
    <div className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-stone-500">Refine the region</p>
          <h2 className="mt-2 font-serif text-2xl text-stone-950">Filter the catalog</h2>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            Filters are URL-driven in this first pass, so you can share a specific view of {catalog.region.title}.
          </p>
        </div>
        <form action={pathname} method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
            Category
            <select
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500"
              name="category"
              defaultValue={appliedFilters.categorySlug ?? ""}
            >
              <option value="">All categories</option>
              {facets.categories.map((facet) => (
                <option key={facet.slug} value={facet.slug}>
                  {facet.title} ({facet.count})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
            Tag
            <select
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500"
              name="tag"
              defaultValue={appliedFilters.tagSlug ?? ""}
            >
              <option value="">All tags</option>
              {facets.tags.map((facet) => (
                <option key={facet.slug} value={facet.slug}>
                  {facet.name} ({facet.count})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
            Destination
            <select
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500"
              name="destination"
              defaultValue={appliedFilters.destinationSlug ?? ""}
            >
              <option value="">All destinations</option>
              {facets.destinations.map((facet) => (
                <option key={facet.slug} value={facet.slug}>
                  {facet.title} ({facet.count})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
            Busyness
            <select
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500"
              name="busyness"
              defaultValue={appliedFilters.busynessRating?.toString() ?? ""}
            >
              <option value="">Any level</option>
              {facets.busynessRatings.map((facet) => (
                <option key={facet.rating} value={facet.rating}>
                  {facet.rating}/5 ({facet.count})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-900 px-5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-800"
              type="submit"
            >
              Apply filters
            </button>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-700 transition hover:border-stone-500 hover:text-stone-950"
              href={pathname}
            >
              Reset
            </Link>
          </div>
        </form>
        {Object.keys(appliedFilters).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeCategory ? <Badge>{activeCategory.title}</Badge> : null}
            {activeTag ? <Badge>{activeTag.name}</Badge> : null}
            {activeDestination ? <Badge>{activeDestination.title}</Badge> : null}
            {appliedFilters.busynessRating ? (
              <Badge tone="warm">{getBusynessLabel(appliedFilters.busynessRating)}</Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
