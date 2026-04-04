import { listModeratorRegionOptions } from "@explorers-map/services";

import { CmsUserForm } from "../../../../../components/cms-user-form";
import { createUserAction } from "../../../actions";

export default function NewCmsUserPage() {
  const regionOptions = listModeratorRegionOptions();

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">New user</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">Create a browser-auth account</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
        Admin-created users receive an initial password here. Phase 9 keeps later password-reset and first-login flows out of scope.
      </p>

      <div className="mt-8">
        <CmsUserForm action={createUserAction} mode="create" regionOptions={regionOptions} />
      </div>
    </section>
  );
}
