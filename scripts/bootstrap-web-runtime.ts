import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDb, getResolvedSqlitePath } from "../packages/db/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const webAppRoot = path.join(projectRoot, "apps", "web");

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function getCountryCount() {
  const dbInstance = createDb(getResolvedSqlitePath());

  try {
    const row = dbInstance.sqlite
      .prepare("select count(*) as count from countries")
      .get() as { count: number };

    return Number(row.count);
  } finally {
    dbInstance.sqlite.close();
  }
}

function startWebServer() {
  const child = spawn(
    process.execPath,
    ["./scripts/run-next.mjs", "start", "--hostname", "0.0.0.0", "--port", "3000"],
    {
      cwd: webAppRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        EXPLORERS_MAP_WORKSPACE_ROOT: projectRoot,
      },
    },
  );

  const forwardSignal = (signal: NodeJS.Signals) => {
    child.kill(signal);
  };

  process.on("SIGINT", forwardSignal);
  process.on("SIGTERM", forwardSignal);

  child.on("exit", (code, signal) => {
    process.off("SIGINT", forwardSignal);
    process.off("SIGTERM", forwardSignal);

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

function main() {
  console.log("Running database migrations...");
  runCommand("pnpm", ["db:migrate"]);

  const countryCount = getCountryCount();

  if (countryCount === 0) {
    console.log("Database is empty. Importing seed data...");
    runCommand("pnpm", ["seed"]);
  } else {
    console.log(`Database already initialized with ${countryCount} countr${countryCount === 1 ? "y" : "ies"}. Skipping seed.`);
  }

  console.log("Starting web server...");
  startWebServer();
}

main();
