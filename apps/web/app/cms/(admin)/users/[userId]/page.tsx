import { notFound } from "next/navigation";

import { getCmsUserDetail, listModeratorRegionOptions } from "@explorers-map/services";

import { CmsUserForm } from "../../../../../components/cms-user-form";
import { updateUserAction } from "../../../actions";

export default async function CmsUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = getCmsUserDetail(userId);

  if (!user) {
    notFound();
  }

  const regionOptions = listModeratorRegionOptions();

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">User</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">{user.name}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">
        Access changes are non-destructive in Phase 9. Name, email, password, and account deletion stay outside this phase.
      </p>

      <div className="mt-8">
        <CmsUserForm
          action={updateUserAction}
          initialValues={{
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            moderatorRegionIds: user.moderatorRegionAssignments.map((assignment) => assignment.regionId),
          }}
          mode="edit"
          regionOptions={regionOptions}
        />
      </div>
    </section>
  );
}
