import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb, type DbInstance } from "@explorers-map/db";
import * as databaseSchema from "@explorers-map/db/schema";
import { ensureUserRole } from "@explorers-map/services";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

type CreateAuthOptions = {
  dbInstance?: DbInstance;
  enableNextCookies?: boolean;
};

export function getBetterAuthBaseUrl() {
  const configuredUrl =
    process.env.BETTER_AUTH_URL?.trim() || process.env.EXPLORERS_MAP_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  return configuredUrl.replace(/\/+$/, "");
}

export function getBetterAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be configured in production.");
  }

  return "explorers-map-development-secret-change-me";
}

export function createAuth(options: CreateAuthOptions = {}) {
  const dbInstance = options.dbInstance ?? getDb();
  const baseURL = getBetterAuthBaseUrl();
  const trustedOrigins = Array.from(
    new Set(
      [baseURL, process.env.EXPLORERS_MAP_PUBLIC_APP_URL?.trim(), process.env.BETTER_AUTH_URL?.trim()].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );

  return betterAuth({
    baseURL,
    secret: getBetterAuthSecret(),
    trustedOrigins,
    database: drizzleAdapter(dbInstance.db, {
      provider: "sqlite",
      schema: databaseSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-up/email": {
          window: 60 * 60,
          max: 10,
        },
        "/sign-in/email": {
          window: 15 * 60,
          max: 30,
        },
      },
    },
    advanced: {
      useSecureCookies: baseURL.startsWith("https://"),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            ensureUserRole(createdUser.id, "viewer", dbInstance);
          },
        },
      },
    },
    plugins: options.enableNextCookies === false ? [] : [nextCookies()],
  });
}

export const auth = createAuth();
