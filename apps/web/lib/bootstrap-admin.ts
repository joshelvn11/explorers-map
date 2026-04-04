import { getDb, user, type DbInstance } from "@explorers-map/db";
import { hasAnyAdminUser, setUserRole } from "@explorers-map/services";

import { createAuth, getBetterAuthBaseUrl } from "./auth.ts";

type BootstrapAdminConfig = {
  name: string;
  email: string;
  password: string;
};

export type BootstrapAdminResult =
  | { status: "skipped_existing_admin" }
  | { status: "skipped_missing_env" }
  | { status: "existing_user_promoted"; userId: string; email: string }
  | { status: "created"; userId: string; email: string };

export async function initializeBootstrapAdmin(dbInstance: DbInstance = getDb()): Promise<BootstrapAdminResult> {
  if (hasAnyAdminUser(dbInstance)) {
    return { status: "skipped_existing_admin" };
  }

  const config = getBootstrapAdminConfig();

  if (!config) {
    return { status: "skipped_missing_env" };
  }

  const existingUser = dbInstance.db
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .all()
    .find((candidate) => candidate.email === config.email);

  if (existingUser) {
    setUserRole(existingUser.id, "admin", dbInstance);
    return {
      status: "existing_user_promoted",
      userId: existingUser.id,
      email: existingUser.email,
    };
  }

  const auth = createAuth({
    dbInstance,
    enableNextCookies: false,
  });
  const result = await auth.api.signUpEmail({
    body: {
      name: config.name,
      email: config.email,
      password: config.password,
    },
    headers: new Headers({
      origin: getBetterAuthBaseUrl(),
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "explorers-map-bootstrap-admin",
    }),
  });

  if (!result?.user?.id) {
    throw new Error("Bootstrap admin creation did not return a user.");
  }

  dbInstance.sqlite.prepare("delete from session where user_id = ?").run(result.user.id);
  setUserRole(result.user.id, "admin", dbInstance);

  return {
    status: "created",
    userId: result.user.id,
    email: result.user.email,
  };
}

function getBootstrapAdminConfig(): BootstrapAdminConfig | null {
  const name = process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_NAME?.trim();
  const email = process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.EXPLORERS_MAP_BOOTSTRAP_ADMIN_PASSWORD?.trim();

  if (!name || !email || !password) {
    return null;
  }

  return {
    name,
    email,
    password,
  };
}
