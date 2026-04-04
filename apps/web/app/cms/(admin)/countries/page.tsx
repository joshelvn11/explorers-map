import Link from "next/link";

import { listCountriesForCms } from "@explorers-map/services";

import { EmptyState } from "../../../../components/empty-state";
import { getCmsCountryHref, getCmsNewCountryHref } from "../../../../lib/routes";

export default function CmsCountriesPage() {
  const countries = listCountriesForCms();

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Countries</p>
          <h2 className="mt-3 font-serif text-3xl text-stone-950">Country records</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            Edit canonical country slugs directly. Redirect history remains out of scope in v1, so changes take effect immediately.
          </p>
        </div>
        <Link
          className="inline-flex min-w-40 items-center justify-center whitespace-nowrap rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          href={getCmsNewCountryHref()}
        >
          Create country
        </Link>
      </div>

      {countries.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            action={
              <Link
                className="inline-flex min-w-40 items-center justify-center whitespace-nowrap rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                href={getCmsNewCountryHref()}
              >
                Create country
              </Link>
            }
            description="Create the first country record to expand the public browse tree."
            title="No countries yet"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {countries.map((country) => (
            <Link
              key={country.id}
              className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5 transition hover:border-sky-300 hover:bg-sky-50"
              href={getCmsCountryHref(country.slug)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{country.slug}</p>
              <h3 className="mt-3 font-serif text-2xl text-stone-950">{country.title}</h3>
              <p className="mt-3 text-sm leading-7 text-stone-600">{country.description}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
