import { notFound, redirect } from "next/navigation";

import { listManageableDestinationRegionOptions } from "@explorers-map/services";

import { CmsDestinationForm } from "../../../../../components/cms-destination-form";
import { updateDestinationAction } from "../../../actions";
import { resolveCmsDestinationAccess } from "../../../../../lib/cms-destinations";
import { requireCmsActor } from "../../../../../lib/session";

export default async function CmsDestinationDetailPage({
  params,
}: {
  params: Promise<{ countrySlug: string; destinationSlug: string }>;
}) {
  const actor = await requireCmsActor("/cms/destinations");
  const { countrySlug, destinationSlug } = await params;
  const access = resolveCmsDestinationAccess(countrySlug, destinationSlug, actor);

  if (!access) {
    notFound();
  }

  if (access.kind === "redirect") {
    redirect(access.redirectTo);
  }

  const destination = access.destination;
  const regionOptions = listManageableDestinationRegionOptions(actor).filter(
    (region) => region.countrySlug === destination.countrySlug,
  );

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Destination</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">{destination.title}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">
        Destination slug edits immediately update canonical public and CMS routes. Region edits remain limited to your current management scope.
      </p>

      <div className="mt-8">
        <CmsDestinationForm
          action={updateDestinationAction}
          countries={[{ slug: destination.countrySlug, title: destination.countryTitle }]}
          initialValues={{
            currentCountrySlug: destination.countrySlug,
            currentDestinationSlug: destination.slug,
            countrySlug: destination.countrySlug,
            title: destination.title,
            slug: destination.slug,
            description: destination.description,
            coverImage: destination.coverImage,
            manageableRegionIds: destination.regions.filter((region) => region.manageableByActor).map((region) => region.regionId),
            readOnlyRegions: destination.regions.filter((region) => !region.manageableByActor),
          }}
          mode="edit"
          regionOptions={regionOptions}
        />
      </div>
    </section>
  );
}
