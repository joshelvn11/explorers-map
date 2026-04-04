import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const rootEnvPath = path.join(repoRoot, ".env");
const nextCommand = process.argv[2];

if (fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      EXPLORERS_MAP_WORKSPACE_ROOT: repoRoot,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (nextCommand === "dev") {
  console.log("Running database migrations before Next.js dev startup...");
  runCommand("pnpm", ["db:migrate"]);

  console.log("Checking bootstrap admin initialization...");
  runCommand("pnpm", ["auth:bootstrap-admin"]);
}

await import("next/dist/bin/next");
