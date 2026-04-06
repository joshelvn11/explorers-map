import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isServiceError } from "@explorers-map/services/errors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const openApiPath = path.join(packageRoot, "openapi", "explorers-map-actions.openapi.json");
const productionOpenApiPath = path.join(
  packageRoot,
  "openapi",
  "explorers-map-actions.production.openapi.json",
);

export type EvidenceItem = {
  label: string;
  note: string;
  url?: string;
};

export type CreateRegionBody = {
  title: string;
  description: string;
  coverImage: string;
  slug?: string;
  evidence?: EvidenceItem[];
};

export type CreateDestinationBody = {
  title: string;
  description: string;
  coverImage?: string | null;
  slug?: string;
  regionSlugs?: string[];
  evidence?: EvidenceItem[];
};

export type CreateListingBody = {
  title: string;
  shortDescription: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  busynessRating?: number | null;
  googleMapsPlaceUrl?: string | null;
  coverImage?: string | null;
  categorySlug?: string | null;
  slug?: string;
  destinationSlugs?: string[];
  images?: Array<{
    imageUrl: string;
    sortOrder: number;
  }>;
  evidence?: EvidenceItem[];
};

type ErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_STATE"
  | "FORBIDDEN"
  | "INSUFFICIENT_EVIDENCE"
  | "INTERNAL_ERROR";

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function ok(data: unknown, init?: ResponseInit) {
  return json(data, { status: 200, ...init });
}

export function created(data: unknown, init?: ResponseInit) {
  return json(data, { status: 201, ...init });
}

export function errorResponse(status: number, code: ErrorCode, message: string, headers?: HeadersInit) {
  return json(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers,
    },
  );
}

export function notFound(message = "Record not found.") {
  return errorResponse(404, "NOT_FOUND", message);
}

export function unauthorized() {
  return errorResponse(401, "UNAUTHENTICATED", "Missing or invalid bearer token.", {
    "WWW-Authenticate": 'Bearer realm="explorers-map-actions"',
  });
}

export function readOpenApiDocumentText() {
  return fs.readFileSync(openApiPath, "utf8");
}

export function readOpenApiDocument() {
  return JSON.parse(readOpenApiDocumentText()) as Record<string, unknown>;
}

export function readProductionOpenApiDocumentText() {
  return fs.readFileSync(productionOpenApiPath, "utf8");
}

export function readProductionOpenApiDocument() {
  return JSON.parse(readProductionOpenApiDocumentText()) as Record<string, unknown>;
}

export function requireActionsAuth(request: Request) {
  const token = process.env.EXPLORERS_MAP_ACTIONS_AUTH_TOKEN?.trim();

  if (!token) {
    return errorResponse(500, "INTERNAL_ERROR", "Actions API auth token is not configured.");
  }

  const header = request.headers.get("authorization");

  if (!header) {
    return unauthorized();
  }

  const [scheme, value] = header.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || value !== token) {
    return unauthorized();
  }

  return null;
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("INVALID_JSON_CONTENT_TYPE");
  }

  try {
    const body = (await request.json()) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("INVALID_JSON_BODY");
    }

    return body as T;
  } catch (error) {
    if (error instanceof Error && (error.message === "INVALID_JSON_BODY" || error.message === "INVALID_JSON_CONTENT_TYPE")) {
      throw error;
    }

    throw new Error("INVALID_JSON_BODY");
  }
}

export function parseLimit(url: URL) {
  const raw = url.searchParams.get("limit");

  if (raw === null) {
    return undefined;
  }

  const limit = Number.parseInt(raw, 10);

  if (!Number.isInteger(limit)) {
    throw invalidInput("limit must be an integer between 1 and 20.");
  }

  return limit;
}

export function parseOptionalNumber(url: URL, name: string) {
  const raw = url.searchParams.get(name);

  if (raw === null) {
    return undefined;
  }

  const value = Number.parseFloat(raw);

  if (!Number.isFinite(value)) {
    throw invalidInput(`${name} must be a valid number.`);
  }

  return value;
}

export function requireSearchQuery(url: URL) {
  const query = url.searchParams.get("query")?.trim();

  if (!query) {
    throw invalidInput("query is required.");
  }

  return query;
}

export function invalidInput(message: string) {
  return new ResponseError(400, "INVALID_INPUT", message);
}

export function handleError(error: unknown) {
  if (error instanceof ResponseError) {
    return errorResponse(error.status, error.code, error.message);
  }

  if (error instanceof Error && error.message === "INVALID_JSON_CONTENT_TYPE") {
    return errorResponse(400, "INVALID_INPUT", "Request body must be JSON with content-type application/json.");
  }

  if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
    return errorResponse(400, "INVALID_INPUT", "Request body must be a valid JSON object.");
  }

  if (isServiceError(error)) {
    return errorResponse(mapServiceErrorStatus(error.code), error.code, error.message);
  }

  console.error("Unhandled Actions API error:", error);
  return errorResponse(500, "INTERNAL_ERROR", "Internal server error.");
}

export async function withActionsAuth(request: Request, handler: () => Promise<Response> | Response) {
  const authResponse = requireActionsAuth(request);

  if (authResponse) {
    return authResponse;
  }

  try {
    return await handler();
  } catch (error) {
    return handleError(error);
  }
}

export async function withoutAuth(handler: () => Promise<Response> | Response) {
  try {
    return await handler();
  } catch (error) {
    return handleError(error);
  }
}

export class ResponseError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = "ResponseError";
    this.status = status;
    this.code = code;
  }
}

function mapServiceErrorStatus(code: string) {
  switch (code) {
    case "INVALID_INPUT":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "INVALID_STATE":
      return 409;
    case "FORBIDDEN":
      return 403;
    case "INSUFFICIENT_EVIDENCE":
      return 422;
    default:
      return 500;
  }
}
