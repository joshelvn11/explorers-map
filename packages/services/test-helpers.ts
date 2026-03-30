import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestContext } from "node:test";

import { createDb, type DbInstance } from "@explorers-map/db";

import { importPreparedSeedData, loadSeedData, prepareSeedData } from "./seed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const preparedSeedData = prepareSeedData(loadSeedData());

export function createSeededTestDb(t: TestContext): DbInstance {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "explorers-map-services-"));
  const dbPath = path.join(tempDir, "explorers-map.sqlite");
  const dbInstance = createDb(dbPath);

  runDbMigrate(dbPath);
  importPreparedSeedData(preparedSeedData, dbInstance);

  t.after(() => {
    dbInstance.sqlite.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  return dbInstance;
}

function runDbMigrate(dbPath: string) {
  const result = spawnSync("pnpm", ["db:migrate"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      EXPLORERS_MAP_SQLITE_PATH: dbPath,
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `db:migrate failed with exit code ${result.status ?? "unknown"}\n${result.stdout}\n${result.stderr}`,
    );
  }
}
