import Link from "next/link";

import { canAccessCms } from "@explorers-map/services";

import { getCurrentActorContext, getCurrentSession } from "../lib/session";
import { getAccountHref, getCmsHref, getCountriesHref, getSignInHref, siteName } from "../lib/routes";

export async function SiteHeader() {
  const session = await getCurrentSession();
  const actor = session?.user?.id ? await getCurrentActorContext() : null;

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[rgba(248,244,238,0.88)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link className="text-stone-950 transition hover:text-emerald-700" href="/">
          <span className="font-serif text-xl">{siteName}</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-stone-700">
          <Link className="transition hover:text-stone-950" href="/">
            Home
          </Link>
          <Link className="transition hover:text-stone-950" href={getCountriesHref()}>
            Countries
          </Link>
          {canAccessCms(actor) ? (
            <Link className="transition hover:text-stone-950" href={getCmsHref()}>
              CMS
            </Link>
          ) : null}
          <Link
            className="inline-flex items-center justify-center rounded-full border border-stone-300 px-3 py-1.5 text-sm transition hover:border-stone-400 hover:text-stone-950"
            href={session?.user ? getAccountHref() : getSignInHref()}
          >
            {session?.user ? "Account" : "Sign in"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
