import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const ignoredDirectoryNames = new Set([".data", ".git", ".next", "coverage", "dist", "node_modules"]);
const outputPath = path.join(workspaceRoot, ".build-info.json");

const files = collectFiles(workspaceRoot);
const hash = crypto.createHash("sha256");

for (const filePath of files) {
  const relativePath = path.relative(workspaceRoot, filePath).split(path.sep).join("/");
  hash.update(relativePath);
  hash.update(fs.readFileSync(filePath));
}

const packageJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8"));
const buildInfo = {
  builtAt: new Date().toISOString(),
  sourceHash: hash.digest("hex").slice(0, 12),
  version: typeof packageJson.version === "string" ? packageJson.version : null,
  ref: process.env.EXPLORERS_MAP_BUILD_VERSION?.trim() || null,
};

fs.writeFileSync(outputPath, `${JSON.stringify(buildInfo, null, 2)}\n`);
console.log(`Wrote build info to ${outputPath}`);

function collectFiles(directoryPath) {
  const filePaths = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    if (ignoredDirectoryNames.has(entry.name) || entry.name === ".build-info.json") {
      continue;
    }

    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...collectFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      filePaths.push(entryPath);
    }
  }

  return filePaths;
}
