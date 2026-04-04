import { CmsCountryForm } from "../../../../../components/cms-country-form";
import { createCountryAction } from "../../../actions";

export default function NewCmsCountryPage() {
  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">New country</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">Create a country record</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
        Country creation is admin-only in Phase 9 and uses the same shared slug validation rules as the editorial service layer.
      </p>

      <div className="mt-8">
        <CmsCountryForm action={createCountryAction} mode="create" />
      </div>
    </section>
  );
}
