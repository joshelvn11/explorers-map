import { listCountriesForCms, listModeratorRegionOptions } from "@explorers-map/services";

import { CmsUserForm } from "../../../../components/cms-user-form";
import { createUserAction } from "../../actions";
import { requireCountryModeratorActor } from "../../../../lib/session";

export default async function NewCmsUserPage() {
  const actor = await requireCountryModeratorActor("/cms/users/new");
  const regionOptions = listModeratorRegionOptions(actor);
  const countryOptions = actor.role === "admin" ? listCountriesForCms(actor) : [];

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">New user</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">Create a browser-auth account</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
        {actor.role === "admin"
          ? "Admins can create any CMS role here. Country moderators still require assigned countries, and moderators stay limited to a single country's regions."
          : "Country moderators can create viewer accounts and single-country moderator accounts inside their assigned countries."}
      </p>

      <div className="mt-8">
        <CmsUserForm
          action={createUserAction}
          actorRole={actor.role === "admin" ? "admin" : "country_moderator"}
          countryOptions={countryOptions}
          mode="create"
          regionOptions={regionOptions}
        />
      </div>
    </section>
  );
}
