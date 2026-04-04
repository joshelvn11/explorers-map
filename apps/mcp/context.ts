import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..", "..");

export const contextResources = [
  {
    name: "platform",
    uri: "explorers-map://context/platform",
    title: "Platform Guide",
    description: "Product brief and platform overview for Explorers Map.",
    filePath: path.join(workspaceRoot, "BRIEF.md"),
  },
  {
    name: "data-model",
    uri: "explorers-map://context/data-model",
    title: "Data Model Guide",
    description: "Repository-wide technical notes and data-flow guidance.",
    filePath: path.join(workspaceRoot, "TECHNICAL.md"),
  },
  {
    name: "editorial-rules",
    uri: "explorers-map://context/editorial-rules",
    title: "Editorial Rules Guide",
    description: "ChatGPT editorial rules and evidence-first operating guidance.",
    filePath: path.join(workspaceRoot, "CHATGPT_MCP_CONTEXT.md"),
  },
] as const;

export function getContextResource(uri: string) {
  return contextResources.find((resource) => resource.uri === uri) ?? null;
}

export function readContextResourceText(uri: string) {
  const resource = getContextResource(uri);

  if (!resource) {
    return null;
  }

  return fs.readFileSync(resource.filePath, "utf8");
}
