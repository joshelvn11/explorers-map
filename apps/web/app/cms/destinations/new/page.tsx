import { listCountriesForCms, listManageableDestinationRegionOptions } from "@explorers-map/services";

import { CmsDestinationForm } from "../../../../components/cms-destination-form";
import { createDestinationAction } from "../../actions";
import { requireCmsActor } from "../../../../lib/session";

export default async function NewCmsDestinationPage() {
  const actor = await requireCmsActor("/cms/destinations/new");
  const regionOptions = listManageableDestinationRegionOptions(actor);
  const allowedCountrySlugs = new Set(regionOptions.map((region) => region.countrySlug));
  const countries =
    actor.role === "admin" || actor.role === "country_moderator"
      ? listCountriesForCms(actor).filter((country) => allowedCountrySlugs.has(country.slug))
      : regionOptions
          .map((region) => ({
            slug: region.countrySlug,
            title: region.countryTitle,
          }))
          .filter((country, index, array) => array.findIndex((entry) => entry.slug === country.slug) === index);

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">New destination</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">Create a destination record</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
        {actor.role === "country_moderator"
          ? "Destination slugs stay unique within a country. Country moderators can create destinations anywhere inside their assigned countries."
          : "Destination slugs stay unique within a country. Moderators can create destinations only inside the regions they manage."}
      </p>

      <div className="mt-8">
        <CmsDestinationForm
          action={createDestinationAction}
          countries={countries.map((country) => ({ slug: country.slug, title: country.title }))}
          mode="create"
          regionOptions={regionOptions}
        />
      </div>
    </section>
  );
}
