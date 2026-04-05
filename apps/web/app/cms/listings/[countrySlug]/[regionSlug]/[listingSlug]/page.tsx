import { notFound, redirect } from "next/navigation";

import { listCategories, listManageableListingDestinationOptions, listManageableListingRegionOptions } from "@explorers-map/services";

import { CmsListingForm } from "../../../../../../components/cms-listing-form";
import { CmsListingLifecycleControls } from "../../../../../../components/cms-listing-lifecycle-controls";
import {
  publishListingAction,
  restoreListingAction,
  trashListingAction,
  unpublishListingAction,
  updateListingAction,
} from "../../../../actions";
import { resolveCmsListingAccess } from "../../../../../../lib/cms-listings";
import { requireCmsActor } from "../../../../../../lib/session";

export default async function CmsListingDetailPage({
  params,
}: {
  params: Promise<{ countrySlug: string; regionSlug: string; listingSlug: string }>;
}) {
  const actor = await requireCmsActor("/cms/listings");
  const { countrySlug, regionSlug, listingSlug } = await params;
  const access = resolveCmsListingAccess(countrySlug, regionSlug, listingSlug, actor);

  if (!access) {
    notFound();
  }

  if (access.kind === "redirect") {
    redirect(access.redirectTo);
  }

  const listing = access.listing;
  const destinationOptions = listManageableListingDestinationOptions(actor, listing.countrySlug);
  const regionOptions = listManageableListingRegionOptions(actor);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={listing.deletedAt ? "rose" : listing.status === "published" ? "emerald" : "stone"}>
            {listing.deletedAt ? "Trashed" : listing.status}
          </StatusPill>
          <StatusPill tone="sky">{listing.regionTitle}</StatusPill>
        </div>

        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Listing</p>
        <h2 className="mt-3 font-serif text-3xl text-stone-950">{listing.title}</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Slug edits update canonical CMS and public routes immediately. Region ownership stays fixed for this phase, while lifecycle controls stay separate from the main editor.
        </p>

        {listing.deletedAt ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This listing is currently in the trash. Restore it before editing its content again.
          </p>
        ) : null}

        <div className="mt-8">
          <CmsListingForm
            action={updateListingAction}
            categories={listCategories()}
            destinationOptions={destinationOptions}
            disabled={listing.deletedAt !== null}
            initialValues={{
              currentCountrySlug: listing.countrySlug,
              currentRegionSlug: listing.regionSlug,
              currentListingSlug: listing.slug,
              regionId: listing.regionId,
              countrySlug: listing.countrySlug,
              regionTitle: listing.regionTitle,
              title: listing.title,
              slug: listing.slug,
              shortDescription: listing.shortDescription,
              description: listing.description,
              coverImage: listing.coverImage,
              categorySlug: listing.category.slug,
              busynessRating: listing.busynessRating,
              latitude: listing.latitude,
              longitude: listing.longitude,
              googleMapsPlaceUrl: listing.googleMapsPlaceUrl ?? "",
              manageableDestinationIds: listing.destinations
                .filter((destination) => destination.manageableByActor)
                .map((destination) => destination.destinationId),
              readOnlyDestinations: listing.destinations
                .filter((destination) => !destination.manageableByActor)
                .map((destination) => ({
                  destinationId: destination.destinationId,
                  destinationTitle: destination.destinationTitle,
                })),
            }}
            mode="edit"
            regionOptions={regionOptions}
          />
        </div>
      </section>

      <CmsListingLifecycleControls
        countrySlug={listing.countrySlug}
        deletedAt={listing.deletedAt}
        listingSlug={listing.slug}
        publishAction={publishListingAction}
        regionSlug={listing.regionSlug}
        restoreAction={restoreListingAction}
        status={listing.status}
        trashAction={trashListingAction}
        unpublishAction={unpublishListingAction}
      />
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "emerald" | "rose" | "sky" | "stone";
}) {
  const className = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    sky: "border-sky-200 bg-sky-50 text-sky-950",
    stone: "border-stone-300 bg-white text-stone-700",
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${className}`}>{children}</span>;
}
