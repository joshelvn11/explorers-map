import Link from "next/link";

import { listCountriesForCms, listDestinationsForCms, listListingsForCms, listRegionsForCms, listCmsUsers } from "@explorers-map/services";

import { buildMetadata } from "../../lib/metadata";
import {
  getCmsCountriesHref,
  getCmsDestinationsHref,
  getCmsListingsHref,
  getCmsNewListingHref,
  getCmsNewDestinationHref,
  getCmsNewCountryHref,
  getCmsNewRegionHref,
  getCmsNewUserHref,
  getCmsRegionsHref,
  getCmsUsersHref,
} from "../../lib/routes";
import { getCurrentActorContext } from "../../lib/session";

export const metadata = buildMetadata({
  title: "CMS",
  description: "Protected editorial shell for Explorers Map admins, country moderators, and moderators.",
});

export default async function CmsPage() {
  const actor = await getCurrentActorContext();
  const countries = actor && (actor.role === "admin" || actor.role === "country_moderator") ? listCountriesForCms(actor) : [];
  const regions = actor && (actor.role === "admin" || actor.role === "country_moderator") ? listRegionsForCms(actor) : [];
  const users = actor && (actor.role === "admin" || actor.role === "country_moderator") ? listCmsUsers(actor) : [];
  const destinations = actor ? listDestinationsForCms(actor) : [];
  const listings = actor ? listListingsForCms(actor) : [];

  return (
    <>
      <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Dashboard</p>
        <h2 className="mt-3 font-serif text-3xl text-stone-950">
          {actor?.role === "admin"
            ? "Admin controls are live"
            : actor?.role === "country_moderator"
              ? "Country moderation is live"
              : "Moderator access is ready"}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
          {actor?.role === "admin"
            ? "Phase 10c now extends the CMS into country-level editorial ownership while shared services continue to own authorization, slug validation, lifecycle behavior, and audit attribution."
            : actor?.role === "country_moderator"
              ? "You can now manage assigned country records, regions, destinations, listings, and the viewer or moderator users that sit inside your country scope."
              : "You can now manage listings and destinations inside your assigned regions, with broader structural management still kept above your role."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Role" value={(actor?.role ?? "viewer").replaceAll("_", " ")} />
        <SummaryCard label="Assigned countries" value={String(actor?.countryModeratorCountryAssignments.length ?? 0)} />
        <SummaryCard label="Assigned regions" value={String(actor?.moderatorRegionAssignments.length ?? 0)} />
        <SummaryCard label="Visible destinations" value={String(destinations.length)} />
        <SummaryCard label="Visible listings" value={String(listings.length)} />
        {actor?.role === "admin" || actor?.role === "country_moderator" ? (
          <>
            <SummaryCard label="Users" value={String(users.length)} />
            <SummaryCard label="Countries / Regions" value={`${countries.length} / ${regions.length}`} />
          </>
        ) : null}
      </section>

      {actor?.role === "admin" ? (
        <section className="grid gap-4 xl:grid-cols-5">
          <QuickLinkCard
            description="Create, edit, publish, unpublish, trash, and restore listings while keeping canonical region routes intact."
            href={getCmsListingsHref()}
            secondaryHref={getCmsNewListingHref()}
            secondaryLabel="New listing"
            title="Listings"
          />
          <QuickLinkCard
            description="Create or edit destinations, manage destination-region links, and keep canonical destination slugs up to date."
            href={getCmsDestinationsHref()}
            secondaryHref={getCmsNewDestinationHref()}
            secondaryLabel="New destination"
            title="Destinations"
          />
          <QuickLinkCard
            description="Create accounts, assign roles, and manage moderator region access."
            href={getCmsUsersHref()}
            secondaryHref={getCmsNewUserHref()}
            secondaryLabel="New user"
            title="Users"
          />
          <QuickLinkCard
            description="Create or edit country records and update canonical country slugs."
            href={getCmsCountriesHref()}
            secondaryHref={getCmsNewCountryHref()}
            secondaryLabel="New country"
            title="Countries"
          />
          <QuickLinkCard
            description="Create or edit region records while keeping region-to-country ownership explicit."
            href={getCmsRegionsHref()}
            secondaryHref={getCmsNewRegionHref()}
            secondaryLabel="New region"
            title="Regions"
          />
        </section>
      ) : actor?.role === "country_moderator" ? (
        <section className="grid gap-4 xl:grid-cols-5">
          <QuickLinkCard
            description="Create, edit, publish, unpublish, trash, and restore listings across your assigned countries."
            href={getCmsListingsHref()}
            secondaryHref={getCmsNewListingHref()}
            secondaryLabel="New listing"
            title="Listings"
          />
          <QuickLinkCard
            description="Create or edit destinations in your countries and fully manage destination-region links there."
            href={getCmsDestinationsHref()}
            secondaryHref={getCmsNewDestinationHref()}
            secondaryLabel="New destination"
            title="Destinations"
          />
          <QuickLinkCard
            description="Create viewer users and single-country moderators within the countries you manage."
            href={getCmsUsersHref()}
            secondaryHref={getCmsNewUserHref()}
            secondaryLabel="New user"
            title="Users"
          />
          <QuickLinkCard
            description="Edit only the country records assigned to you."
            href={getCmsCountriesHref()}
            secondaryHref={getCmsCountriesHref()}
            secondaryLabel="Open countries"
            title="Countries"
          />
          <QuickLinkCard
            description="Create or edit region records within your assigned countries."
            href={getCmsRegionsHref()}
            secondaryHref={getCmsNewRegionHref()}
            secondaryLabel="New region"
            title="Regions"
          />
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          <QuickLinkCard
            description="Create and manage listings inside your assigned regions, with destination choices staying scoped to what you can manage."
            href={getCmsListingsHref()}
            secondaryHref={getCmsNewListingHref()}
            secondaryLabel="New listing"
            title="Listings"
          />
          <QuickLinkCard
            description="Edit destinations that overlap your assigned regions and extend them into other regions you manage."
            href={getCmsDestinationsHref()}
            secondaryHref={getCmsNewDestinationHref()}
            secondaryLabel="New destination"
            title="Destinations"
          />
        </section>
      )}
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{label}</p>
      <p className="mt-4 text-2xl font-semibold capitalize text-stone-950">{value}</p>
    </div>
  );
}

function QuickLinkCard({
  title,
  description,
  href,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description: string;
  href: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur">
      <h3 className="font-serif text-2xl text-stone-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-stone-600">{description}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          href={href}
        >
          Open
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:text-stone-950"
          href={secondaryHref}
        >
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
