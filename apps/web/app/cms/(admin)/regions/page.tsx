import Link from "next/link";

import { listRegionsForCms } from "@explorers-map/services";

import { EmptyState } from "../../../../components/empty-state";
import { getCmsNewRegionHref, getCmsRegionHref } from "../../../../lib/routes";

export default function CmsRegionsPage() {
  const regions = listRegionsForCms();

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Regions</p>
          <h2 className="mt-3 font-serif text-3xl text-stone-950">Region records</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            Regions stay tied to a single parent country in Phase 9. Country reassignment is intentionally deferred.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          href={getCmsNewRegionHref()}
        >
          Create region
        </Link>
      </div>

      {regions.length === 0 ? (
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
            description="No regions exist yet. Create a region under an existing country to expand public browsing."
            title="No regions yet"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {regions.map((region) => (
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
