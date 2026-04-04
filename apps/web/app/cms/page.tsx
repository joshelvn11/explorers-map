import Link from "next/link";

import { listCountriesForCms, listRegionsForCms, listCmsUsers } from "@explorers-map/services";

import { buildMetadata } from "../../lib/metadata";
import {
  getCmsCountriesHref,
  getCmsNewCountryHref,
  getCmsNewRegionHref,
  getCmsNewUserHref,
  getCmsRegionsHref,
  getCmsUsersHref,
} from "../../lib/routes";
import { getCurrentActorContext } from "../../lib/session";

export const metadata = buildMetadata({
  title: "CMS",
  description: "Protected editorial shell for Explorers Map admins and moderators.",
});

export default async function CmsPage() {
  const actor = await getCurrentActorContext();
  const countries = actor?.role === "admin" ? listCountriesForCms() : [];
  const regions = actor?.role === "admin" ? listRegionsForCms() : [];
  const users = actor?.role === "admin" ? listCmsUsers() : [];

  return (
    <>
      <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Dashboard</p>
        <h2 className="mt-3 font-serif text-3xl text-stone-950">
          {actor?.role === "admin" ? "Admin controls are live" : "Moderator access is ready"}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
          {actor?.role === "admin"
            ? "Phase 9 adds the first real CMS structure: user access management, country editing, and region editing, all backed by shared service-layer authorization."
            : "You can enter the protected CMS shell now. Admin-only management stays hidden here until the later moderator editorial workflows land."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Role" value={actor?.role ?? "viewer"} />
        <SummaryCard label="Assigned regions" value={String(actor?.moderatorRegionAssignments.length ?? 0)} />
        {actor?.role === "admin" ? (
          <>
            <SummaryCard label="Users" value={String(users.length)} />
            <SummaryCard label="Countries / Regions" value={`${countries.length} / ${regions.length}`} />
          </>
        ) : null}
      </section>

      {actor?.role === "admin" ? (
        <section className="grid gap-4 xl:grid-cols-3">
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
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-stone-300 bg-white/82 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Coming next</p>
          <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">
            Moderator content-management flows for destinations and listings are planned for Phase 10. Your assigned
            regions will control the later editorial surface.
          </p>
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
