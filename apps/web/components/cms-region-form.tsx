"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { CountryCmsRecord } from "@explorers-map/services";

import type { CmsFormState } from "../lib/cms-form-state";
import { initialCmsFormState } from "../lib/cms-form-state";

type CmsRegionFormProps = {
  mode: "create" | "edit";
  action: (state: CmsFormState, formData: FormData) => Promise<CmsFormState>;
  countries: CountryCmsRecord[];
  initialValues?: {
    currentCountrySlug: string;
    currentRegionSlug: string;
    countrySlug: string;
    title: string;
    slug: string;
    description: string;
    coverImage: string;
  };
};

export function CmsRegionForm({ mode, action, countries, initialValues }: CmsRegionFormProps) {
  const [state, formAction] = useActionState(action, initialCmsFormState);

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" ? (
        <>
          <input name="currentCountrySlug" type="hidden" value={initialValues?.currentCountrySlug ?? ""} />
          <input name="currentRegionSlug" type="hidden" value={initialValues?.currentRegionSlug ?? ""} />
        </>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Country</span>
          {mode === "create" ? (
            <select
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
              defaultValue={initialValues?.countrySlug ?? countries[0]?.slug ?? ""}
              name="countrySlug"
            >
              {countries.map((country) => (
                <option key={country.id} value={country.slug}>
                  {country.title}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input name="countrySlug" type="hidden" value={initialValues?.countrySlug ?? ""} />
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-700">
                {countries.find((country) => country.slug === initialValues?.countrySlug)?.title ?? initialValues?.countrySlug}
              </div>
            </>
          )}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Title</span>
          <input
            required
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
            defaultValue={initialValues?.title}
            name="title"
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Slug</span>
          <input
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
            defaultValue={initialValues?.slug}
            name="slug"
            type="text"
          />
          <span className="text-xs leading-5 text-stone-500">Leave blank to derive the slug from the title.</span>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Cover image URL</span>
          <input
            required
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
            defaultValue={initialValues?.coverImage}
            name="coverImage"
            type="url"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-800">Description</span>
        <textarea
          required
          className="min-h-40 w-full rounded-[1.5rem] border border-stone-300 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
          defaultValue={initialValues?.description}
          name="description"
        />
      </label>

      {state.errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.errorMessage}</p>
      ) : null}

      <CmsSubmitButton label={mode === "create" ? "Create region" : "Save region"} />
    </form>
  );
}

function CmsSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}
