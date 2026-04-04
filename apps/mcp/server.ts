import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  attachListingImagesForEditor,
  assignDestinationRegions,
  assignListingDestinationsForEditor,
  createDestination,
  createListingDraftForEditor,
  createRegion,
  ensureDestination,
  ensureListing,
  ensureRegion,
  findDestination,
  findListing,
  findRegion,
  getDestinationForEditor,
  getListingForEditor,
  getRegionForEditor,
  listCategories,
  listDestinationsForEditor,
  listListingsForEditor,
  listRegionsForEditor,
  publishListingForEditor,
  restoreListingForEditor,
  setListingLocationForEditor,
  trashListingForEditor,
  updateListingCopyForEditor,
  updateListingMetadataForEditor,
} from "@explorers-map/services";
import { isServiceError } from "@explorers-map/services/errors";
import { z } from "zod";

import { contextResources, readContextResourceText } from "./context.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = __dirname;

export type McpRuntimeConfig = {
  host: string;
  port: number;
  authToken: string;
};

const writeContext = {
  source: "mcp",
  actorId: null,
} as const;

const evidenceItemSchema = z.object({
  label: z.string().trim().min(1),
  note: z.string().trim().min(1),
  url: z.string().url().optional(),
});

const evidenceSchema = z.array(evidenceItemSchema).min(1);
const listingImageInputSchema = z.array(
  z.object({
    imageUrl: z.string().trim().min(1),
    sortOrder: z.number().int().positive(),
  }),
);

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): McpRuntimeConfig {
  const host = env.EXPLORERS_MAP_MCP_HOST?.trim() || "127.0.0.1";
  const portValue = env.EXPLORERS_MAP_MCP_PORT?.trim() || "3001";
  const authToken = env.EXPLORERS_MAP_MCP_AUTH_TOKEN?.trim() || "";
  const port = Number.parseInt(portValue, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("EXPLORERS_MAP_MCP_PORT must be an integer between 1 and 65535.");
  }

  if (!authToken) {
    throw new Error("EXPLORERS_MAP_MCP_AUTH_TOKEN must be set before starting the MCP server.");
  }

  return {
    host,
    port,
    authToken,
  };
}

export function createMcpHttpServer(config: McpRuntimeConfig) {
  return http.createServer(async (req, res) => {
    try {
      await handleRequest(req, res, config);
    } catch (error) {
      console.error("Unhandled MCP HTTP error:", error);

      if (!res.headersSent) {
        sendJsonRpcError(res, 500, "INTERNAL_ERROR", "Internal server error.");
      }
    }
  });
}

export function startMcpServer(config: McpRuntimeConfig) {
  const server = createMcpHttpServer(config);

  return new Promise<http.Server>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, config: McpRuntimeConfig) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/healthz" && req.method === "GET") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname !== "/mcp") {
    sendJson(res, 404, { error: "Not Found" });
    return;
  }

  if (!isAuthorized(req, config.authToken)) {
    sendJsonRpcError(res, 401, "UNAUTHENTICATED", "Missing or invalid bearer token.", {
      "WWW-Authenticate": 'Bearer realm="explorers-map-mcp"',
    });
    return;
  }

  if (req.method === "GET" || req.method === "DELETE") {
    sendJsonRpcError(res, 405, "INVALID_INPUT", "Method not allowed.", {
      Allow: "POST",
    });
    return;
  }

  if (req.method !== "POST") {
    sendJsonRpcError(res, 405, "INVALID_INPUT", "Method not allowed.", {
      Allow: "POST",
    });
    return;
  }

  const parsedBody = await readJsonBody(req, res);

  if (parsedBody === undefined) {
    return;
  }

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
  } catch (error) {
    console.error("Error handling MCP transport request:", error);

    if (!res.headersSent) {
      sendJsonRpcError(res, 500, "INTERNAL_ERROR", "Internal server error.");
    }
  }
}

function createMcpServer() {
  const server = new McpServer(
    {
      name: "explorers-map",
      version: "0.0.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  registerResources(server);
  registerTools(server);

  return server;
}

function registerResources(server: McpServer) {
  for (const resource of contextResources) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: "text/markdown",
      },
      async () => ({
        contents: [
          {
            uri: resource.uri,
            mimeType: "text/markdown",
            text: readContextResourceText(resource.uri) ?? "",
          },
        ],
      }),
    );
  }
}

function registerTools(server: McpServer) {
  registerTool(server, "list_categories", {
    description: "Return the fixed curated listing categories.",
  }, async () => ({
    categories: listCategories(),
  }));

  registerTool(
    server,
    "list_regions",
    {
      description: "List regions within one country.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
      },
    },
    async ({ countrySlug }) => ({
      regions: listRegionsForEditor(countrySlug),
    }),
  );

  registerTool(
    server,
    "find_region",
    {
      description: "Fuzzy-find a region within one country.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        query: z.string().trim().min(1),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async (args) => findRegion(args),
  );

  registerTool(
    server,
    "get_region",
    {
      description: "Fetch one region by country and region slug.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
      },
    },
    async ({ countrySlug, regionSlug }) => ({
      region: getRegionForEditor({ countrySlug, regionSlug }),
    }),
  );

  registerTool(
    server,
    "ensure_region",
    {
      description: "Reuse an existing region when possible or create a new one with evidence.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        coverImage: z.string().trim().min(1),
        slug: z.string().trim().min(1).optional(),
        evidence: evidenceSchema.optional(),
      },
    },
    async (args) => ensureRegion(args),
  );

  registerTool(
    server,
    "create_region",
    {
      description: "Force creation of a new region after duplicate checks are complete.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        coverImage: z.string().trim().min(1),
        slug: z.string().trim().min(1).optional(),
        evidence: evidenceSchema,
      },
    },
    async (args) => createRegion(args),
  );

  registerTool(
    server,
    "list_destinations",
    {
      description: "List destinations within one country, optionally filtered to one region.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1).optional(),
      },
    },
    async ({ countrySlug, regionSlug }) => ({
      destinations: listDestinationsForEditor({ countrySlug, regionSlug }),
    }),
  );

  registerTool(
    server,
    "find_destination",
    {
      description: "Fuzzy-find a destination within one country.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        query: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1).optional(),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async (args) => findDestination(args),
  );

  registerTool(
    server,
    "get_destination",
    {
      description: "Fetch one destination by country and destination slug.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        destinationSlug: z.string().trim().min(1),
      },
    },
    async ({ countrySlug, destinationSlug }) => ({
      destination: getDestinationForEditor({ countrySlug, destinationSlug }),
    }),
  );

  registerTool(
    server,
    "ensure_destination",
    {
      description: "Reuse an existing destination when possible or create a new one with evidence.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        coverImage: z.string().trim().min(1),
        slug: z.string().trim().min(1).optional(),
        regionSlugs: z.array(z.string().trim().min(1)).optional(),
        evidence: evidenceSchema.optional(),
      },
    },
    async (args) => ensureDestination(args),
  );

  registerTool(
    server,
    "create_destination",
    {
      description: "Force creation of a new destination after duplicate checks are complete.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        coverImage: z.string().trim().min(1),
        slug: z.string().trim().min(1).optional(),
        regionSlugs: z.array(z.string().trim().min(1)).optional(),
        evidence: evidenceSchema,
      },
    },
    async (args) => createDestination(args),
  );

  registerTool(
    server,
    "assign_destination_regions",
    {
      description: "Replace the region set for a destination.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        destinationSlug: z.string().trim().min(1),
        regionSlugs: z.array(z.string().trim().min(1)),
        evidence: evidenceSchema.optional(),
      },
    },
    async (args) => assignDestinationRegions(args),
  );

  registerTool(
    server,
    "list_listings",
    {
      description: "List listings within one region or destination for editorial review.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1).optional(),
        destinationSlug: z.string().trim().min(1).optional(),
        includeDrafts: z.boolean().optional(),
        includeTrashed: z.boolean().optional(),
      },
    },
    async (args) => ({
      listings: listListingsForEditor(assertSingleListingScope(args)),
    }),
  );

  registerTool(
    server,
    "find_listing",
    {
      description: "Fuzzy-find a listing while considering scope and coordinates.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        query: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1).optional(),
        destinationSlug: z.string().trim().min(1).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async (args) => findListing(args),
  );

  registerTool(
    server,
    "get_listing",
    {
      description: "Fetch one listing with editorial fields and lifecycle state.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug }) => ({
      listing: getListingForEditor({ countrySlug, regionSlug, listingSlug }),
    }),
  );

  registerTool(
    server,
    "ensure_listing",
    {
      description: "Reuse an existing listing when possible or create a duplicate-safe draft with evidence.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        title: z.string().trim().min(1),
        shortDescription: z.string().trim().min(1),
        description: z.string().trim().min(1),
        latitude: z.number(),
        longitude: z.number(),
        busynessRating: z.number().int().min(1).max(5),
        googleMapsPlaceUrl: z.string().url().optional(),
        coverImage: z.string().trim().min(1),
        categorySlug: z.string().trim().min(1),
        slug: z.string().trim().min(1).optional(),
        destinationSlugs: z.array(z.string().trim().min(1)).optional(),
        images: listingImageInputSchema.optional(),
        evidence: evidenceSchema.optional(),
      },
    },
    async (args) => ensureListing(args, writeContext),
  );

  registerTool(
    server,
    "create_listing_draft",
    {
      description: "Create a fully populated listing draft after duplicate checks are complete.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        title: z.string().trim().min(1),
        shortDescription: z.string().trim().min(1),
        description: z.string().trim().min(1),
        latitude: z.number(),
        longitude: z.number(),
        busynessRating: z.number().int().min(1).max(5),
        googleMapsPlaceUrl: z.string().url().optional(),
        coverImage: z.string().trim().min(1),
        categorySlug: z.string().trim().min(1),
        slug: z.string().trim().min(1).optional(),
        destinationSlugs: z.array(z.string().trim().min(1)).optional(),
        images: listingImageInputSchema.optional(),
        evidence: evidenceSchema,
      },
    },
    async (args) => createListingDraftForEditor(args, writeContext),
  );

  registerTool(
    server,
    "update_listing_copy",
    {
      description: "Update title or descriptive copy fields for a listing.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
        title: z.string().trim().min(1).optional(),
        shortDescription: z.string().trim().min(1).optional(),
        description: z.string().trim().min(1).optional(),
        evidence: evidenceSchema.optional(),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug, ...patch }) =>
      updateListingCopyForEditor({ countrySlug, regionSlug, listingSlug }, patch, writeContext),
  );

  registerTool(
    server,
    "update_listing_metadata",
    {
      description: "Update non-location listing metadata.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
        slug: z.string().trim().min(1).optional(),
        coverImage: z.string().trim().min(1).optional(),
        categorySlug: z.string().trim().min(1).optional(),
        busynessRating: z.number().int().min(1).max(5).optional(),
        evidence: evidenceSchema.optional(),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug, ...patch }) =>
      updateListingMetadataForEditor({ countrySlug, regionSlug, listingSlug }, patch, writeContext),
  );

  registerTool(
    server,
    "set_listing_location",
    {
      description: "Set listing coordinates and optional Google Maps place URL.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
        latitude: z.number(),
        longitude: z.number(),
        googleMapsPlaceUrl: z.string().url().optional(),
        evidence: evidenceSchema.optional(),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug, ...input }) =>
      setListingLocationForEditor({ countrySlug, regionSlug, listingSlug }, input, writeContext),
  );

  registerTool(
    server,
    "assign_listing_destinations",
    {
      description: "Replace the destination set for a listing.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
        destinationSlugs: z.array(z.string().trim().min(1)),
        evidence: evidenceSchema.optional(),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug, ...input }) =>
      assignListingDestinationsForEditor({ countrySlug, regionSlug, listingSlug }, input, writeContext),
  );

  registerTool(
    server,
    "attach_listing_images",
    {
      description: "Replace the gallery image set for a listing.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
        images: listingImageInputSchema,
        evidence: evidenceSchema.optional(),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug, ...input }) =>
      attachListingImagesForEditor({ countrySlug, regionSlug, listingSlug }, input, writeContext),
  );

  registerTool(
    server,
    "publish_listing",
    {
      description: "Publish an existing draft listing.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
        evidence: evidenceSchema.optional(),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug, evidence }) =>
      publishListingForEditor({ countrySlug, regionSlug, listingSlug }, evidence, writeContext),
  );

  registerTool(
    server,
    "move_listing_to_trash",
    {
      description: "Soft-delete a listing into trash.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
        evidence: evidenceSchema.optional(),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug, evidence }) =>
      trashListingForEditor({ countrySlug, regionSlug, listingSlug }, evidence, writeContext),
  );

  registerTool(
    server,
    "restore_listing_from_trash",
    {
      description: "Restore a trashed listing.",
      inputSchema: {
        countrySlug: z.string().trim().min(1),
        regionSlug: z.string().trim().min(1),
        listingSlug: z.string().trim().min(1),
        evidence: evidenceSchema.optional(),
      },
    },
    async ({ countrySlug, regionSlug, listingSlug, evidence }) =>
      restoreListingForEditor({ countrySlug, regionSlug, listingSlug }, evidence, writeContext),
  );
}

function registerTool(
  server: McpServer,
  name: string,
  config: {
    description: string;
    inputSchema?: Record<string, z.ZodTypeAny>;
  },
  handler: (args: any) => Promise<Record<string, unknown>> | Record<string, unknown>,
) {
  server.registerTool(
    name,
    {
      description: config.description,
      inputSchema: config.inputSchema,
    },
    async (args) => {
      try {
        const payload = await handler(args ?? {});
        return toToolResult(payload);
      } catch (error) {
        return toToolError(error);
      }
    },
  );
}

function toToolResult(payload: Record<string, unknown>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
  };
}

function toToolError(error: unknown) {
  const payload =
    isServiceError(error)
      ? {
          error: {
            code: error.code,
            message: error.message,
          },
        }
      : {
          error: {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : "Unknown error.",
          },
        };

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
  };
}

function assertSingleListingScope(args: {
  countrySlug: string;
  regionSlug?: string;
  destinationSlug?: string;
  includeDrafts?: boolean;
  includeTrashed?: boolean;
}) {
  const hasRegion = Boolean(args.regionSlug);
  const hasDestination = Boolean(args.destinationSlug);

  if ((hasRegion && hasDestination) || (!hasRegion && !hasDestination)) {
    throw new Error("Provide exactly one of regionSlug or destinationSlug.");
  }

  return hasRegion
    ? {
        countrySlug: args.countrySlug,
        regionSlug: args.regionSlug!,
        includeDrafts: args.includeDrafts,
        includeTrashed: args.includeTrashed,
      }
    : {
        countrySlug: args.countrySlug,
        destinationSlug: args.destinationSlug!,
        includeDrafts: args.includeDrafts,
        includeTrashed: args.includeTrashed,
      };
}

function isAuthorized(req: IncomingMessage, expectedToken: string) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return false;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);

  return scheme === "Bearer" && token === expectedToken;
}

async function readJsonBody(req: IncomingMessage, res: ServerResponse) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();

  if (!rawBody) {
    sendJsonRpcError(res, 400, "INVALID_INPUT", "Request body must be valid JSON.");
    return undefined;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    sendJsonRpcError(res, 400, "INVALID_INPUT", "Request body must be valid JSON.");
    return undefined;
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown, headers: Record<string, string> = {}) {
  res.writeHead(statusCode, {
    "content-type": "application/json",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function sendJsonRpcError(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
) {
  sendJson(
    res,
    statusCode,
    {
      jsonrpc: "2.0",
      error: {
        code,
        message,
      },
      id: null,
    },
    headers,
  );
}

async function main() {
  const config = getRuntimeConfig();
  const server = await startMcpServer(config);

  console.log(
    `Explorers Map MCP server listening on http://${config.host}:${config.port}/mcp from ${packageRoot}`,
  );

  const shutdown = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  void main();
}
