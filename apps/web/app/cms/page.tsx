import { buildMetadata } from "../../lib/metadata";
import { getCurrentActorContext } from "../../lib/session";

export const metadata = buildMetadata({
  title: "CMS",
  description: "Protected editorial shell for Explorers Map admins and moderators.",
});

export default async function CmsPage() {
  const actor = await getCurrentActorContext();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-800">Protected CMS shell</p>
        <h1 className="mt-3 font-serif text-4xl text-stone-950">Editorial access foundation is live</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
          Phase 8 only establishes browser auth, role checks, and route protection. The full admin and editorial tooling will land in the next phases on top of this shell.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Current role</p>
            <p className="mt-4 text-2xl font-semibold capitalize text-stone-950">{actor?.role ?? "viewer"}</p>
          </div>
          <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Assigned regions</p>
            <p className="mt-4 text-sm leading-6 text-stone-700">
              {actor?.moderatorRegionAssignments.length
                ? actor.moderatorRegionAssignments.map((assignment) => assignment.regionTitle).join(", ")
                : "Admins have global access. Moderators will show their assigned regions here once Phase 9 user management lands."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
