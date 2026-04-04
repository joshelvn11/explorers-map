import Link from "next/link";

import { buildMetadata } from "../../lib/metadata";
import { getCmsHref } from "../../lib/routes";
import { getCurrentActorContext, requireAuthenticatedSession } from "../../lib/session";
import { SignOutButton } from "../../components/sign-out-button";

export const metadata = buildMetadata({
  title: "Account",
  description: "Your signed-in Explorers Map account and role details.",
});

export default async function AccountPage() {
  const session = await requireAuthenticatedSession("/account");
  const actor = await getCurrentActorContext();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-800">Account</p>
        <h1 className="mt-3 font-serif text-4xl text-stone-950">Signed in as {session.user.name}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
          This is the Phase 8 account surface: enough to confirm browser auth, role defaults, and protected session behavior before the fuller CMS arrives.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Identity</p>
            <dl className="mt-4 space-y-3 text-sm text-stone-700">
              <div>
                <dt className="font-medium text-stone-900">Name</dt>
                <dd>{session.user.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-900">Email</dt>
                <dd>{session.user.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-stone-900">Role</dt>
                <dd className="capitalize">{actor?.role ?? "viewer"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">CMS access</p>
            <p className="mt-4 text-sm leading-6 text-stone-700">
              {actor?.role === "admin" || actor?.role === "moderator"
                ? "Your current role can enter the protected CMS shell."
                : "Viewer accounts can sign in successfully but cannot access the CMS in this phase."}
            </p>
            {actor?.role === "admin" || actor?.role === "moderator" ? (
              <Link
                className="mt-5 inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                href={getCmsHref()}
              >
                Open CMS
              </Link>
            ) : null}
          </div>
        </div>

        {actor?.moderatorRegionAssignments.length ? (
          <section className="mt-8 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Moderator regions</p>
            <ul className="mt-4 space-y-2 text-sm text-stone-700">
              {actor.moderatorRegionAssignments.map((assignment) => (
                <li key={`${assignment.userId}:${assignment.regionId}`}>
                  {assignment.regionTitle} ({assignment.regionSlug})
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-8">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
