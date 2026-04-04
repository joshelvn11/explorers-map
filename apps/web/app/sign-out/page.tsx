import Link from "next/link";

import { SignOutButton } from "../../components/sign-out-button";
import { buildMetadata } from "../../lib/metadata";
import { getAccountHref } from "../../lib/routes";
import { requireAuthenticatedSession } from "../../lib/session";

export const metadata = buildMetadata({
  title: "Sign out",
  description: "End your current Explorers Map browser session.",
});

export default async function SignOutPage() {
  await requireAuthenticatedSession("/sign-out");

  return (
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-800">Session</p>
        <h1 className="mt-3 font-serif text-4xl text-stone-950">Ready to sign out?</h1>
        <p className="mt-4 text-base leading-7 text-stone-600">
          Signing out clears your browser session and returns you to public browsing.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <SignOutButton className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400" />
          <Link
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
            href={getAccountHref()}
          >
            Cancel
          </Link>
        </div>
      </section>
    </main>
  );
}
