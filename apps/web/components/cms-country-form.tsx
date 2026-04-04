"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { CmsFormState } from "../lib/cms-form-state";
import { initialCmsFormState } from "../lib/cms-form-state";

type CmsCountryFormProps = {
  mode: "create" | "edit";
  action: (state: CmsFormState, formData: FormData) => Promise<CmsFormState>;
  initialValues?: {
    currentSlug: string;
    title: string;
    slug: string;
    description: string;
    coverImage: string;
  };
};

export function CmsCountryForm({ mode, action, initialValues }: CmsCountryFormProps) {
  const [state, formAction] = useActionState(action, initialCmsFormState);

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" ? <input name="currentSlug" type="hidden" value={initialValues?.currentSlug ?? ""} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

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

      <CmsSubmitButton label={mode === "create" ? "Create country" : "Save country"} />
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
