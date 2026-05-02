import Link from "next/link";

import type { AuthActorContext } from "@explorers-map/services";

import {
  getAccountHref,
  getCmsCountriesHref,
  getCmsDestinationsHref,
  getCmsHref,
  getCmsListingsHref,
  getCmsRegionsHref,
  getCmsUsersHref,
} from "../lib/routes";
import { SignOutButton } from "./sign-out-button";

export function CmsShell({
  actor,
  children,
}: {
  actor: AuthActorContext;
  children: React.ReactNode;
}) {
  const isAdmin = actor.role === "admin";
  const isCountryModerator = actor.role === "country_moderator";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(14,116,144,0.12),rgba(245,158,11,0.14),rgba(255,255,255,0.92))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">CMS</p>
            <h1 className="mt-3 font-serif text-4xl text-stone-950">Editorial workspace</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
              {isAdmin
                ? "The CMS shell is now role-aware. Admins can manage access and structure globally across the full editorial system."
                : isCountryModerator
                  ? "Country moderators can now manage assigned countries, their regions, destinations, listings, and the viewer or moderator users that sit inside that country scope."
                  : "Region moderators can now manage listings and destinations scoped to their assigned regions."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:text-stone-950"
              href={getAccountHref()}
            >
              Account
            </Link>
            <SignOutButton className="inline-flex items-center justify-center rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-stone-800" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Access</p>
            <p className="mt-4 text-2xl font-semibold capitalize text-stone-950">{actor.role.replaceAll("_", " ")}</p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {actor.role === "admin"
                ? "Global CMS access with user and structure management."
                : actor.role === "country_moderator"
                  ? actor.countryModeratorCountryAssignments.length
                    ? actor.countryModeratorCountryAssignments.map((assignment) => assignment.countryTitle).join(", ")
                    : "Country assignments will appear here once an admin configures them."
                : actor.moderatorRegionAssignments.length
                  ? actor.moderatorRegionAssignments.map((assignment) => assignment.regionTitle).join(", ")
                  : "Moderator region assignments will appear here once an admin configures them."}
            </p>
          </section>

          <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Navigation</p>
            <nav className="mt-4 space-y-2">
              <CmsNavLink href={getCmsHref()} label="Dashboard" />
              <CmsNavLink href={getCmsListingsHref()} label="Listings" />
              <CmsNavLink href={getCmsDestinationsHref()} label="Destinations" />
              {isAdmin || isCountryModerator ? (
                <>
                  <CmsNavLink href={getCmsUsersHref()} label="Users" />
                  <CmsNavLink href={getCmsCountriesHref()} label="Countries" />
                  <CmsNavLink href={getCmsRegionsHref()} label="Regions" />
                </>
              ) : (
                <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-3 text-sm leading-6 text-stone-600">
                  User, country, and region sections stay hidden here. Your listing and destination edits remain limited to your managed regions.
                </p>
              )}
            </nav>
          </section>
        </aside>

        <div className="space-y-6">{children}</div>
      </div>
    </main>
  );
}

function CmsNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50/85 px-4 py-3 text-sm font-medium text-stone-800 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-950"
      href={href}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-stone-400">
        →
      </span>
    </Link>
  );
}
