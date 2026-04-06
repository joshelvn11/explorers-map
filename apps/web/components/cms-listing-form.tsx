"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { CategoryRecord, ListingDestinationOption, ListingRegionOption } from "@explorers-map/services";

import type { CmsFormState } from "../lib/cms-form-state";
import { initialCmsFormState } from "../lib/cms-form-state";

type CmsListingFormProps = {
  mode: "create" | "edit";
  action: (state: CmsFormState, formData: FormData) => Promise<CmsFormState>;
  categories: CategoryRecord[];
  destinationOptions: ListingDestinationOption[];
  regionOptions: ListingRegionOption[];
  disabled?: boolean;
  initialValues?: {
    currentCountrySlug: string;
    currentRegionSlug: string;
    currentListingSlug: string;
    regionId: string;
    countrySlug: string;
    regionTitle: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string;
    coverImage: string | null;
    categorySlug: string | null;
    busynessRating: number | null;
    latitude: number | null;
    longitude: number | null;
    googleMapsPlaceUrl: string;
    manageableDestinationIds: string[];
    readOnlyDestinations: Array<{
      destinationId: string;
      destinationTitle: string;
    }>;
  };
};

export function CmsListingForm({
  mode,
  action,
  categories,
  destinationOptions,
  regionOptions,
  disabled = false,
  initialValues,
}: CmsListingFormProps) {
  const [state, formAction] = useActionState(action, initialCmsFormState);
  const [selectedRegionId, setSelectedRegionId] = useState(initialValues?.regionId ?? regionOptions[0]?.regionId ?? "");
  const selectedRegion = regionOptions.find((region) => region.regionId === (mode === "edit" ? initialValues?.regionId : selectedRegionId));
  const filteredDestinations = destinationOptions.filter((destination) => destination.countrySlug === selectedRegion?.countrySlug);

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" ? (
        <>
          <input name="currentCountrySlug" type="hidden" value={initialValues?.currentCountrySlug ?? ""} />
          <input name="currentRegionSlug" type="hidden" value={initialValues?.currentRegionSlug ?? ""} />
          <input name="currentListingSlug" type="hidden" value={initialValues?.currentListingSlug ?? ""} />
        </>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Region</span>
          {mode === "create" ? (
            <select
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              defaultValue={selectedRegionId}
              disabled={disabled}
              name="regionId"
              onChange={(event) => setSelectedRegionId(event.currentTarget.value)}
            >
              {regionOptions.map((region) => (
                <option key={region.regionId} value={region.regionId}>
                  {region.countryTitle} - {region.regionTitle}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input name="regionId" type="hidden" value={initialValues?.regionId ?? ""} />
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-700">
                {initialValues?.regionTitle}
              </div>
            </>
          )}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Title</span>
          <input
            required
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            defaultValue={initialValues?.title}
            disabled={disabled}
            name="title"
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-2 md:col-span-1">
          <span className="text-sm font-medium text-stone-800">Slug</span>
          <input
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            defaultValue={initialValues?.slug}
            disabled={disabled}
            name="slug"
            type="text"
          />
          <span className="text-xs leading-5 text-stone-500">Leave blank to derive the slug from the title.</span>
        </label>

        <label className="block space-y-2 md:col-span-1">
          <span className="text-sm font-medium text-stone-800">Category</span>
          <select
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            defaultValue={initialValues?.categorySlug ?? ""}
            disabled={disabled}
            name="categorySlug"
          >
            <option value="">Not set yet</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 md:col-span-1">
          <span className="text-sm font-medium text-stone-800">Busyness rating</span>
          <select
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            defaultValue={initialValues?.busynessRating === null || initialValues?.busynessRating === undefined ? "" : String(initialValues.busynessRating)}
            disabled={disabled}
            name="busynessRating"
          >
            <option value="">Not set yet</option>
            <option value="1">1 - Very quiet</option>
            <option value="2">2 - Usually calm</option>
            <option value="3">3 - Steady</option>
            <option value="4">4 - Popular</option>
            <option value="5">5 - Very busy</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-800">Short description</span>
        <textarea
          required
          className="min-h-28 w-full rounded-[1.5rem] border border-stone-300 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          defaultValue={initialValues?.shortDescription}
          disabled={disabled}
          name="shortDescription"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-800">Description</span>
        <textarea
          required
          className="min-h-48 w-full rounded-[1.5rem] border border-stone-300 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          defaultValue={initialValues?.description}
          disabled={disabled}
          name="description"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Cover image URL</span>
          <input
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            defaultValue={initialValues?.coverImage ?? ""}
            disabled={disabled}
            name="coverImage"
            type="url"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Google Maps URL</span>
          <input
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            defaultValue={initialValues?.googleMapsPlaceUrl}
            disabled={disabled}
            name="googleMapsPlaceUrl"
            type="url"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Latitude</span>
          <input
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            defaultValue={initialValues?.latitude ?? ""}
            disabled={disabled}
            name="latitude"
            step="any"
            type="number"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Longitude</span>
          <input
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            defaultValue={initialValues?.longitude ?? ""}
            disabled={disabled}
            name="longitude"
            step="any"
            type="number"
          />
        </label>
      </div>

      <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
        <div>
          <p className="text-sm font-medium text-stone-800">Linked destinations</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Destination options stay limited to the current listing country and your management scope.
          </p>
        </div>

        {filteredDestinations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white/80 px-4 py-3 text-sm text-stone-600">
            No editable destinations are available for this listing yet.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredDestinations.map((destination) => (
              <label
                key={destination.destinationId}
                className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
              >
                <input
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
                  defaultChecked={initialValues?.manageableDestinationIds.includes(destination.destinationId)}
                  disabled={disabled}
                  name="destinationIds"
                  type="checkbox"
                  value={destination.destinationId}
                />
                <span>
                  <span className="block font-medium text-stone-900">{destination.destinationTitle}</span>
                  <span className="block text-xs text-stone-500">{destination.regionTitles.join(", ")}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        {mode === "edit" && (initialValues?.readOnlyDestinations.length ?? 0) > 0 ? (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-sm font-medium text-amber-950">Read-only linked destinations</p>
            <p className="text-sm leading-6 text-amber-900">
              These destination links are outside your current scope and will stay attached unless an admin changes them.
            </p>
            <div className="flex flex-wrap gap-2">
              {initialValues?.readOnlyDestinations.map((destination) => (
                <span
                  key={destination.destinationId}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-950"
                >
                  {destination.destinationTitle}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {state.errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.errorMessage}</p>
      ) : null}

      {!disabled ? <CmsSubmitButton label={mode === "create" ? "Create listing" : "Save listing"} /> : null}
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
