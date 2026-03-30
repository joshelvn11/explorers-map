import { defineConfig } from "drizzle-kit";

import { getResolvedSqlitePath } from "./packages/db/client";

export default defineConfig({
  schema: "./packages/db/schema.ts",
  out: "./packages/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: getResolvedSqlitePath(),
  },
  strict: true,
  verbose: true,
});
