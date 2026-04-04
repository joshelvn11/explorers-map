import { getDb } from "../packages/db/index.ts";
import { initializeBootstrapAdmin } from "../apps/web/lib/bootstrap-admin.ts";

async function main() {
  const dbInstance = getDb();

  try {
    const result = await initializeBootstrapAdmin(dbInstance);
    console.log(`Bootstrap admin status: ${result.status}`);

    if ("email" in result) {
      console.log(`Bootstrap admin email: ${result.email}`);
    }
  } finally {
    dbInstance.sqlite.close();
  }
}

await main();
