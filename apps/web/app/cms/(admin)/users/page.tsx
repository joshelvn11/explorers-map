import Link from "next/link";

import { listCmsUsers } from "@explorers-map/services";

import { EmptyState } from "../../../../components/empty-state";
import { getCmsNewUserHref, getCmsUserHref } from "../../../../lib/routes";

export default function CmsUsersPage() {
  const users = listCmsUsers();

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/88 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-800">Users</p>
          <h2 className="mt-3 font-serif text-3xl text-stone-950">Admin user management</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
            Manage CMS roles and moderator region assignments without destructive account actions.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          href={getCmsNewUserHref()}
        >
          Create user
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            action={
              <Link
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
                href={getCmsNewUserHref()}
              >
                Create the first user
              </Link>
            }
            description="No authenticated users exist yet. Create an account here or through public sign-up, then assign the right role."
            title="No users yet"
          />
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-stone-600">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Moderator regions</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {users.map((record) => (
                <tr key={record.userId}>
                  <td className="px-4 py-4 align-top">
                    <Link className="font-semibold text-sky-800 transition hover:text-sky-950" href={getCmsUserHref(record.userId)}>
                      {record.name}
                    </Link>
                    <p className="mt-1 text-stone-600">{record.email}</p>
                  </td>
                  <td className="px-4 py-4 align-top capitalize text-stone-800">{record.role}</td>
                  <td className="px-4 py-4 align-top text-stone-600">
                    {record.moderatorRegionAssignments.length
                      ? record.moderatorRegionAssignments.map((assignment) => assignment.regionTitle).join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-4 align-top text-stone-600">{formatDate(record.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
