import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const rootEnvPath = path.join(repoRoot, ".env");

process.loadEnvFile(rootEnvPath);

await import("next/dist/bin/next");
