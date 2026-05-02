import type { CmsRole } from "@explorers-map/db";

export type CmsUserFormActorRole = "admin" | "country_moderator";

export function getCmsUserRoleOptions(actorRole: CmsUserFormActorRole): { value: CmsRole; label: string }[] {
  return actorRole === "admin"
    ? [
        { value: "viewer", label: "Viewer" },
        { value: "moderator", label: "Moderator" },
        { value: "country_moderator", label: "Country moderator" },
        { value: "admin", label: "Admin" },
      ]
    : [
        { value: "viewer", label: "Viewer" },
        { value: "moderator", label: "Moderator" },
      ];
}
