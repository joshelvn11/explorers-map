import { notFound } from "next/navigation";

import { getCountryForCms } from "@explorers-map/services";

import { CmsCountryForm } from "../../../../../components/cms-country-form";
import { updateCountryAction } from "../../../actions";

export default async function CmsCountryDetailPage({
  params,
}: {
  params: Promise<{ countrySlug: string }>;
}) {
  const { countrySlug } = await params;
  const country = getCountryForCms(countrySlug);

  if (!country) {
    notFound();
  }

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Country</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">{country.title}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">
        Updating the slug here immediately changes the canonical country URL in the public app and CMS.
      </p>

      <div className="mt-8">
        <CmsCountryForm
          action={updateCountryAction}
          initialValues={{
            currentSlug: country.slug,
            title: country.title,
            slug: country.slug,
            description: country.description,
            coverImage: country.coverImage,
          }}
          mode="edit"
        />
      </div>
    </section>
  );
}
