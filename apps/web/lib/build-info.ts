import fs from "node:fs";
import path from "node:path";

type StoredBuildInfo = {
  builtAt?: string | null;
  sourceHash?: string | null;
  version?: string | null;
  ref?: string | null;
};

export type BuildInfo = {
  label: string;
  builtAtText: string | null;
};

export async function getBuildInfo(): Promise<BuildInfo> {
  const storedBuildInfo = readStoredBuildInfo();

  if (!storedBuildInfo) {
    return {
      label: process.env.NODE_ENV === "production" ? "runtime" : "local-dev",
      builtAtText: null,
    };
  }

  return {
    label: storedBuildInfo.ref || storedBuildInfo.sourceHash || storedBuildInfo.version || "unknown",
    builtAtText: formatBuildTimestamp(storedBuildInfo.builtAt),
  };
}

function readStoredBuildInfo(): StoredBuildInfo | null {
  const filePath = path.join(getWorkspaceRoot(), ".build-info.json");

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as StoredBuildInfo;
  } catch {
    return null;
  }
}

function getWorkspaceRoot() {
  const configuredRoot = process.env.EXPLORERS_MAP_WORKSPACE_ROOT;

  if (configuredRoot && configuredRoot.trim().length > 0) {
    return path.resolve(process.cwd(), configuredRoot);
  }

  return path.resolve(process.cwd(), "../..");
}

function formatBuildTimestamp(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return null;
  }

  return parsedValue.toISOString().replace(".000Z", "Z").replace("T", " ");
}
