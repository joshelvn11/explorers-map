import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSeedSummary,
  collectSeedWarnings,
  importPreparedSeedData,
  loadSeedData,
  prepareSeedData,
  type NormalizedSeedData,
} from "../packages/services/seed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "seed-data", "generated");
const outputFile = path.join(outputDir, "seed.snapshot.json");

function printSummary(summary: ReturnType<typeof buildSeedSummary>) {
  console.log("Counts:");

  for (const [key, value] of Object.entries(summary)) {
    console.log(`- ${key}: ${value}`);
  }
}

function printWarnings(warnings: string[]) {
  if (warnings.length === 0) {
    return;
  }

  console.log("");
  console.log("Warnings:");

  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

function writeSnapshot(data: NormalizedSeedData) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function runValidate() {
  const preparedSeedData = prepareSeedData(loadSeedData());
  const summary = buildSeedSummary(preparedSeedData);
  const warnings = collectSeedWarnings(preparedSeedData);

  console.log("Seed data validated successfully.");
  console.log("");
  printSummary(summary);
  printWarnings(warnings);
}

function runImport() {
  const preparedSeedData = prepareSeedData(loadSeedData());
  writeSnapshot(preparedSeedData);

  const result = importPreparedSeedData(preparedSeedData);

  console.log("Seed data validated and imported successfully.");
  console.log(`Snapshot written to ${path.relative(projectRoot, outputFile)}`);
  console.log(`Database seeded at ${result.filePath}`);
  console.log("");
  printSummary(result.summary);
  printWarnings(result.warnings);
}

function main() {
  const mode = process.argv[2] ?? "import";

  if (mode === "validate") {
    runValidate();
    return;
  }

  if (mode === "import") {
    runImport();
    return;
  }

  throw new Error(`Unknown seed mode: ${mode}`);
}

main();
