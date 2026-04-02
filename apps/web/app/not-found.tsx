import Link from "next/link";

import { EmptyState } from "../components/empty-state";
import { getCountriesHref } from "../lib/routes";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        title="That page could not be found"
        description="The place you were looking for either does not exist or is not publicly available."
        action={
          <Link
            className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-800"
            href={getCountriesHref()}
          >
            Browse countries
          </Link>
        }
      />
    </main>
  );
}
