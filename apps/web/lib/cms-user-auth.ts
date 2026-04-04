import { getDb, type DbInstance } from "@explorers-map/db";
import { requireAdminActor, requireCmsRole, updateCmsUserAccess, type AuthActorContext } from "@explorers-map/services";

import { createAuth, getBetterAuthBaseUrl, type ExplorersMapAuth } from "./auth.ts";

export type CreateCmsUserInput = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "moderator" | "viewer";
  moderatorRegionIds?: string[];
};

export async function createCmsUserAccount(
  input: CreateCmsUserInput,
  actor: AuthActorContext,
  dbInstance: DbInstance = getDb(),
  authInstance: ExplorersMapAuth = createAuth({ dbInstance, enableNextCookies: false }),
) {
  requireAdminActor(actor);
  const name = requireName(input.name);
  const email = requireEmail(input.email);
  const password = requirePassword(input.password);
  const role = requireCmsRole(input.role);
  const existingUser = dbInstance.sqlite.prepare("select id from user where email = ?").get(email) as { id: string } | undefined;

  if (existingUser) {
    throw new Error(`An account already exists for ${email}. Open that user instead of creating a duplicate.`);
  }

  const result = await authInstance.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
    headers: new Headers({
      origin: getBetterAuthBaseUrl(),
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "explorers-map-admin-create-user",
    }),
  });

  if (!result?.user?.id) {
    throw new Error("User creation did not return a persisted account.");
  }

  dbInstance.sqlite.prepare("delete from session where user_id = ?").run(result.user.id);
  updateCmsUserAccess(
    {
      userId: result.user.id,
      role,
      moderatorRegionIds: input.moderatorRegionIds ?? [],
    },
    actor,
    dbInstance,
  );

  return {
    userId: result.user.id,
    email: result.user.email,
  };
}

function requireName(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Name is required.");
  }

  return normalized;
}

function requireEmail(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized || !normalized.includes("@")) {
    throw new Error("A valid email is required.");
  }

  return normalized;
}

function requirePassword(value: string) {
  if (value.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return value;
}
