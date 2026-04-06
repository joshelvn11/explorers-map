"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { DestinationRegionOption } from "@explorers-map/services";

import type { CmsFormState } from "../lib/cms-form-state";
import { initialCmsFormState } from "../lib/cms-form-state";

type CountryOption = {
  slug: string;
  title: string;
};

type ReadOnlyRegion = DestinationRegionOption;

type CmsDestinationFormProps = {
  mode: "create" | "edit";
  action: (state: CmsFormState, formData: FormData) => Promise<CmsFormState>;
  countries: CountryOption[];
  regionOptions: DestinationRegionOption[];
  initialValues?: {
    currentCountrySlug: string;
    currentDestinationSlug: string;
    countrySlug: string;
    title: string;
    slug: string;
    description: string;
    coverImage: string | null;
    manageableRegionIds: string[];
    readOnlyRegions: ReadOnlyRegion[];
  };
};

export function CmsDestinationForm({ mode, action, countries, regionOptions, initialValues }: CmsDestinationFormProps) {
  const [state, formAction] = useActionState(action, initialCmsFormState);
  const [selectedCountrySlug, setSelectedCountrySlug] = useState(initialValues?.countrySlug ?? countries[0]?.slug ?? "");
  const editableRegions = regionOptions.filter((region) =>
    region.countrySlug === (mode === "edit" ? initialValues?.countrySlug : selectedCountrySlug),
  );

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" ? (
        <>
          <input name="currentCountrySlug" type="hidden" value={initialValues?.currentCountrySlug ?? ""} />
          <input name="currentDestinationSlug" type="hidden" value={initialValues?.currentDestinationSlug ?? ""} />
        </>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Country</span>
          {mode === "create" ? (
            <select
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
              defaultValue={selectedCountrySlug}
              name="countrySlug"
              onChange={(event) => setSelectedCountrySlug(event.currentTarget.value)}
            >
              {countries.map((country) => (
                <option key={country.slug} value={country.slug}>
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
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
            defaultValue={initialValues?.coverImage ?? ""}
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

      <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
        <div>
          <p className="text-sm font-medium text-stone-800">Linked regions</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {mode === "create"
              ? "Select the regions this destination should be linked to at creation time."
              : "Editable regions are limited to your current management scope. Read-only regions below will be preserved automatically."}
          </p>
        </div>

        {editableRegions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white/80 px-4 py-3 text-sm text-stone-600">
            No editable regions are available for this country.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {editableRegions.map((region) => (
              <label
                key={region.regionId}
                className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
              >
                <input
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
                  defaultChecked={initialValues?.manageableRegionIds.includes(region.regionId)}
                  name="regionIds"
                  type="checkbox"
                  value={region.regionId}
                />
                <span>
                  <span className="block font-medium text-stone-900">{region.regionTitle}</span>
                  <span className="block text-xs text-stone-500">{region.regionSlug}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        {mode === "edit" && (initialValues?.readOnlyRegions.length ?? 0) > 0 ? (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-sm font-medium text-amber-950">Read-only linked regions</p>
            <p className="text-sm leading-6 text-amber-900">
              These regions are outside your current management scope and will stay linked unless an admin changes them.
            </p>
            <div className="flex flex-wrap gap-2">
              {initialValues?.readOnlyRegions.map((region) => (
                <span
                  key={region.regionId}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-950"
                >
                  {region.regionTitle}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {state.errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.errorMessage}</p>
      ) : null}

      <CmsSubmitButton label={mode === "create" ? "Create destination" : "Save destination"} />
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
