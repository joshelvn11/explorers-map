"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { CountryCmsRecord, ModeratorRegionOption } from "@explorers-map/services";

import type { CmsFormState } from "../lib/cms-form-state";
import { initialCmsFormState } from "../lib/cms-form-state";
import { getCmsUserRoleOptions, type CmsUserFormActorRole } from "../lib/cms-user-form-options.ts";

type CmsUserFormProps = {
  mode: "create" | "edit";
  action: (state: CmsFormState, formData: FormData) => Promise<CmsFormState>;
  actorRole: CmsUserFormActorRole;
  countryOptions: CountryCmsRecord[];
  regionOptions: ModeratorRegionOption[];
  initialValues?: {
    userId: string;
    name: string;
    email: string;
    role: "admin" | "country_moderator" | "moderator" | "viewer";
    moderatorRegionIds: string[];
    countryModeratorCountryIds: string[];
  };
};

export function CmsUserForm({ mode, action, actorRole, countryOptions, regionOptions, initialValues }: CmsUserFormProps) {
  const [state, formAction] = useActionState(action, initialCmsFormState);
  const [role, setRole] = useState<"admin" | "country_moderator" | "moderator" | "viewer">(
    initialValues?.role ?? "viewer",
  );

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" ? <input name="userId" type="hidden" value={initialValues?.userId ?? ""} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Name</span>
          {mode === "create" ? (
            <input
              required
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
              name="name"
              type="text"
            />
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-700">
              {initialValues?.name}
            </div>
          )}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Email</span>
          {mode === "create" ? (
            <input
              required
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
              name="email"
              type="email"
            />
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-700">
              {initialValues?.email}
            </div>
          )}
        </label>
      </div>

      {mode === "create" ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-800">Initial password</span>
          <input
            required
            minLength={8}
            className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
            name="password"
            type="password"
          />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-800">Role</span>
        <select
          className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-sky-500 focus:bg-white"
          defaultValue={initialValues?.role ?? "viewer"}
          name="role"
          onChange={(event) =>
            setRole(event.currentTarget.value as "admin" | "country_moderator" | "moderator" | "viewer")
          }
        >
          {getCmsUserRoleOptions(actorRole).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {actorRole === "admin" ? (
        <section className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-stone-950">Country moderator countries</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                Required when the selected role is country moderator. Other roles ignore these assignments.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                role === "country_moderator" ? "bg-sky-100 text-sky-900" : "bg-stone-200 text-stone-600"
              }`}
            >
              {role === "country_moderator" ? "Required" : "Optional"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {countryOptions.map((country) => (
              <label
                key={country.id}
                className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
              >
                <input
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
                  defaultChecked={initialValues?.countryModeratorCountryIds.includes(country.id)}
                  name="countryModeratorCountryIds"
                  type="checkbox"
                  value={country.id}
                />
                <span>
                  <span className="block font-medium text-stone-900">{country.title}</span>
                  <span className="block text-xs uppercase tracking-[0.18em] text-stone-500">{country.slug}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-950">Moderator regions</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Required when the selected role is moderator. Region assignments must stay inside one country.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
              role === "moderator" ? "bg-sky-100 text-sky-900" : "bg-stone-200 text-stone-600"
            }`}
          >
            {role === "moderator" ? "Required" : "Optional"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {regionOptions.map((option) => (
            <label
              key={option.regionId}
              className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
            >
              <input
                className="mt-1 h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
                defaultChecked={initialValues?.moderatorRegionIds.includes(option.regionId)}
                name="moderatorRegionIds"
                type="checkbox"
                value={option.regionId}
              />
              <span>
                <span className="block font-medium text-stone-900">{option.regionTitle}</span>
                <span className="block text-xs uppercase tracking-[0.18em] text-stone-500">{option.countryTitle}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {state.errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.errorMessage}</p>
      ) : null}

      <CmsSubmitButton label={mode === "create" ? "Create user" : "Save access changes"} />
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
