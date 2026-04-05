"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { CmsFormState } from "../lib/cms-form-state";
import { initialCmsFormState } from "../lib/cms-form-state";

type LifecycleAction = (state: CmsFormState, formData: FormData) => Promise<CmsFormState>;

type CmsListingLifecycleControlsProps = {
  countrySlug: string;
  regionSlug: string;
  listingSlug: string;
  status: "draft" | "published";
  deletedAt: string | null;
  publishAction: LifecycleAction;
  unpublishAction: LifecycleAction;
  trashAction: LifecycleAction;
  restoreAction: LifecycleAction;
};

export function CmsListingLifecycleControls({
  countrySlug,
  regionSlug,
  listingSlug,
  status,
  deletedAt,
  publishAction,
  unpublishAction,
  trashAction,
  restoreAction,
}: CmsListingLifecycleControlsProps) {
  const [publishState, publishFormAction] = useActionState(publishAction, initialCmsFormState);
  const [unpublishState, unpublishFormAction] = useActionState(unpublishAction, initialCmsFormState);
  const [trashState, trashFormAction] = useActionState(trashAction, initialCmsFormState);
  const [restoreState, restoreFormAction] = useActionState(restoreAction, initialCmsFormState);
  const errorMessage =
    publishState.errorMessage ?? unpublishState.errorMessage ?? trashState.errorMessage ?? restoreState.errorMessage;

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
      <div>
        <p className="text-sm font-medium text-stone-800">Lifecycle</p>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Publish, unpublish, trash, or restore this listing without leaving the editor.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {deletedAt ? (
          <LifecycleForm
            action={restoreFormAction}
            buttonClassName="bg-emerald-600 text-white hover:bg-emerald-500"
            countrySlug={countrySlug}
            label="Restore"
            listingSlug={listingSlug}
            regionSlug={regionSlug}
          />
        ) : (
          <>
            {status === "draft" ? (
              <LifecycleForm
                action={publishFormAction}
                buttonClassName="bg-emerald-600 text-white hover:bg-emerald-500"
                countrySlug={countrySlug}
                label="Publish"
                listingSlug={listingSlug}
                regionSlug={regionSlug}
              />
            ) : (
              <LifecycleForm
                action={unpublishFormAction}
                buttonClassName="border border-stone-300 text-stone-800 hover:border-stone-400 hover:text-stone-950"
                countrySlug={countrySlug}
                label="Unpublish"
                listingSlug={listingSlug}
                regionSlug={regionSlug}
              />
            )}

            <LifecycleForm
              action={trashFormAction}
              buttonClassName="border border-rose-300 text-rose-700 hover:border-rose-400 hover:text-rose-800"
              countrySlug={countrySlug}
              label="Move to trash"
              listingSlug={listingSlug}
              regionSlug={regionSlug}
            />
          </>
        )}
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
      ) : null}
    </section>
  );
}

function LifecycleForm({
  action,
  buttonClassName,
  countrySlug,
  label,
  listingSlug,
  regionSlug,
}: {
  action: (formData: FormData) => void;
  buttonClassName: string;
  countrySlug: string;
  label: string;
  listingSlug: string;
  regionSlug: string;
}) {
  return (
    <form action={action}>
      <input name="countrySlug" type="hidden" value={countrySlug} />
      <input name="regionSlug" type="hidden" value={regionSlug} />
      <input name="listingSlug" type="hidden" value={listingSlug} />
      <LifecycleButton buttonClassName={buttonClassName} label={label} />
    </form>
  );
}

function LifecycleButton({ buttonClassName, label }: { buttonClassName: string; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${buttonClassName}`}
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}
