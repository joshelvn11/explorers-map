import Link from "next/link";

import { getCountriesHref, siteName } from "../lib/routes";

export function SiteHeader() {
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
        </nav>
      </div>
    </header>
  );
}
