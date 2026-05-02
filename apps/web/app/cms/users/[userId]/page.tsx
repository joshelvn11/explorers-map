import { redirect } from "next/navigation";

import { getCmsUserDetail, listCountriesForCms, listModeratorRegionOptions } from "@explorers-map/services";
import { isServiceError } from "@explorers-map/services/errors";

import { CmsUserForm } from "../../../../components/cms-user-form";
import { updateUserAction } from "../../actions";
import { requireCountryModeratorActor } from "../../../../lib/session";

export default async function CmsUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const actor = await requireCountryModeratorActor("/cms/users");
  const { userId } = await params;
  let user;

  try {
    user = getCmsUserDetail(userId, actor);
  } catch (error) {
    if (isServiceError(error) && error.code === "FORBIDDEN") {
      redirect("/cms/users");
    }

    throw error;
  }

  if (!user) {
    redirect("/cms/users");
  }

  const regionOptions = listModeratorRegionOptions(actor);
  const countryOptions = actor.role === "admin" ? listCountriesForCms(actor) : [];

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">User</p>
      <h2 className="mt-3 font-serif text-3xl text-stone-950">{user.name}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-600">
        Access changes are non-destructive. Name, email, password, and account deletion still stay outside this phase.
      </p>

      <div className="mt-8">
        <CmsUserForm
          action={updateUserAction}
          actorRole={actor.role === "admin" ? "admin" : "country_moderator"}
          countryOptions={countryOptions}
          initialValues={{
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            moderatorRegionIds: user.moderatorRegionAssignments.map((assignment) => assignment.regionId),
            countryModeratorCountryIds: user.countryModeratorCountryAssignments.map((assignment) => assignment.countryId),
          }}
          mode="edit"
          regionOptions={regionOptions}
        />
      </div>
    </section>
  );
}
