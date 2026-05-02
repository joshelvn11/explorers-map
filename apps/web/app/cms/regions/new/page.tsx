import { listCountriesForCms } from "@explorers-map/services";

import { CmsRegionForm } from "../../../../components/cms-region-form";
import { createRegionAction } from "../../actions";
import { requireCountryModeratorActor } from "../../../../lib/session";

export default async function NewCmsRegionPage() {
  const actor = await requireCountryModeratorActor("/cms/regions/new");
  const countries = listCountriesForCms(actor);

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">New region</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">Create a region record</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
        Region slugs stay unique within a country, and country moderators can create regions only inside their assigned countries.
      </p>

      <div className="mt-8">
        <CmsRegionForm action={createRegionAction} countries={countries} mode="create" />
      </div>
    </section>
  );
}
