import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = findWorkspaceRoot();
const defaultSqlitePath = path.join(workspaceRoot, ".data", "explorers-map.sqlite");

export type ExplorersMapDatabase = BetterSQLite3Database<typeof schema>;
export type SqliteClient = InstanceType<typeof Database>;

export type DbInstance = {
  db: ExplorersMapDatabase;
  sqlite: SqliteClient;
  filePath: string;
};

declare global {
  var __explorersMapDb: DbInstance | undefined;
}

function findWorkspaceRoot() {
  const startDirectories = [
    process.env.EXPLORERS_MAP_WORKSPACE_ROOT,
    process.env.INIT_CWD,
    process.env.npm_config_local_prefix,
    process.cwd(),
    __dirname,
  ]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .map((value) => path.resolve(value));

  for (const startDirectory of startDirectories) {
    let currentDirectory = startDirectory;

    while (true) {
      if (fs.existsSync(path.join(currentDirectory, "pnpm-workspace.yaml"))) {
        return currentDirectory;
      }

      const parentDirectory = path.dirname(currentDirectory);

      if (parentDirectory === currentDirectory) {
        break;
      }

      currentDirectory = parentDirectory;
    }
  }

  return path.resolve(__dirname, "..", "..");
}
export function getResolvedSqlitePath(inputPath = process.env.EXPLORERS_MAP_SQLITE_PATH): string {
  if (!inputPath || inputPath.trim().length === 0) {
    return defaultSqlitePath;
  }

  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  return path.resolve(workspaceRoot, inputPath);
}

export function createDb(filePath = getResolvedSqlitePath()): DbInstance {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const sqlite = new Database(filePath);
  sqlite.pragma("foreign_keys = ON");

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
    filePath,
  };
}

export function getDb(): DbInstance {
  if (!globalThis.__explorersMapDb) {
    globalThis.__explorersMapDb = createDb();
  }

  return globalThis.__explorersMapDb;
}
