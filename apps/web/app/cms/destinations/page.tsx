import Link from "next/link";

import { listDestinationsForCms } from "@explorers-map/services";

import { EmptyState } from "../../../components/empty-state";
import {
  getCmsDestinationHref,
  getCmsNewDestinationHref,
} from "../../../lib/routes";
import { requireCmsActor } from "../../../lib/session";

export default async function CmsDestinationsPage() {
  const actor = await requireCmsActor("/cms/destinations");
  const destinations = listDestinationsForCms(actor);

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Destinations</p>
          <h2 className="mt-3 font-serif text-3xl text-stone-950">Destination records</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            {actor.role === "admin"
              ? "Admins can create and edit any destination, including global destination-region linking."
              : "You can edit destinations only when they overlap one of your managed regions, and your edits stay scoped to those regions."}
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          href={getCmsNewDestinationHref()}
        >
          Create destination
        </Link>
      </div>

      {destinations.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            action={
              <Link
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                href={getCmsNewDestinationHref()}
              >
                Create destination
              </Link>
            }
            description="No visible destinations are available yet. Create one to start curating named discovery areas."
            title="No destinations yet"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {destinations.map((destination) => (
            <Link
              key={destination.id}
              className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5 transition hover:border-sky-300 hover:bg-sky-50"
              href={getCmsDestinationHref(destination.countrySlug, destination.slug)}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{destination.countryTitle}</p>
              <h3 className="mt-3 font-serif text-2xl text-stone-950">{destination.title}</h3>
              <p className="mt-2 text-sm text-stone-500">{destination.slug}</p>
              <p className="mt-3 text-sm leading-7 text-stone-600">{destination.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {destination.regions.map((region) => (
                  <span
                    key={region.regionId}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      region.manageableByActor
                        ? "border-sky-200 bg-sky-50 text-sky-950"
                        : "border-stone-300 bg-white text-stone-700"
                    }`}
                  >
                    {region.regionTitle}
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
