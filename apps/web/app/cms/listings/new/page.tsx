import { listCategories, listManageableListingDestinationOptions, listManageableListingRegionOptions } from "@explorers-map/services";

import { CmsListingForm } from "../../../../components/cms-listing-form";
import { EmptyState } from "../../../../components/empty-state";
import { createListingAction } from "../../actions";
import { requireCmsActor } from "../../../../lib/session";

export default async function NewCmsListingPage() {
  const actor = await requireCmsActor("/cms/listings/new");
  const regionOptions = listManageableListingRegionOptions(actor);

  if (regionOptions.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <EmptyState
          description="An admin needs to assign you at least one region before you can create listings."
          title="No listing regions available"
        />
      </section>
    );
  }

  const destinationOptions = Array.from(new Map(
    regionOptions
      .map((region) => region.countrySlug)
      .flatMap((countrySlug) => listManageableListingDestinationOptions(actor, countrySlug))
      .map((destination) => [destination.destinationId, destination]),
  ).values());

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">New listing</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">Create a listing record</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
        Region ownership is chosen at creation time and stays fixed in Phase 10b. Destination options stay scoped to the selected region's country and your current permissions.
      </p>

      <div className="mt-8">
        <CmsListingForm
          action={createListingAction}
          categories={listCategories()}
          destinationOptions={destinationOptions}
          mode="create"
          regionOptions={regionOptions}
        />
      </div>
    </section>
  );
}
