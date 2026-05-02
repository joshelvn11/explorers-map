import { notFound, redirect } from "next/navigation";

import { getRegionForCms, listCountriesForCms } from "@explorers-map/services";
import { isServiceError } from "@explorers-map/services/errors";

import { CmsRegionForm } from "../../../../../components/cms-region-form";
import { updateRegionAction } from "../../../actions";
import { requireCountryModeratorActor } from "../../../../../lib/session";

export default async function CmsRegionDetailPage({
  params,
}: {
  params: Promise<{ countrySlug: string; regionSlug: string }>;
}) {
  const actor = await requireCountryModeratorActor("/cms/regions");
  const { countrySlug, regionSlug } = await params;
  let region;

  try {
    region = getRegionForCms(countrySlug, regionSlug, actor);
  } catch (error) {
    if (isServiceError(error) && error.code === "FORBIDDEN") {
      redirect("/cms/regions");
    }

    throw error;
  }

  if (!region) {
    notFound();
  }

  const countries = listCountriesForCms(actor);

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Region</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">{region.title}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">
        Region slug edits immediately update the canonical public and CMS routes. The parent country remains fixed in this phase.
      </p>

      <div className="mt-8">
        <CmsRegionForm
          action={updateRegionAction}
          countries={countries}
          initialValues={{
            currentCountrySlug: region.countrySlug,
            currentRegionSlug: region.slug,
            countrySlug: region.countrySlug,
            title: region.title,
            slug: region.slug,
            description: region.description,
            coverImage: region.coverImage,
          }}
          mode="edit"
        />
      </div>
    </section>
  );
}
