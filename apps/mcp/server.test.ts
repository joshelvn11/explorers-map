import assert from "node:assert/strict";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolResultSchema,
  ListResourcesResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { createMcpHttpServer } from "./server.ts";

const token = "test-mcp-token";

function getResultText(result: { content: Array<{ type: string; text?: string }> }) {
  return result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n");
}

test("unauthenticated MCP requests are rejected", async (t) => {
  const server = createMcpHttpServer({
    host: "127.0.0.1",
    port: 0,
    authToken: token,
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address === "object");

  const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
  const payload = (await response.json()) as {
    error: {
      code: string;
      message: string;
    };
  };

  assert.equal(response.status, 401);
  assert.equal(payload.error.code, "UNAUTHENTICATED");
});

test("MCP resources are listed and readable through the client transport", async (t) => {
  const server = createMcpHttpServer({
    host: "127.0.0.1",
    port: 0,
    authToken: token,
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  const client = new Client(
    {
      name: "mcp-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  await client.connect(transport);
  t.after(async () => {
    await client.close();
  });

  const resources = await client.request(
    {
      method: "resources/list",
      params: {},
    },
    ListResourcesResultSchema,
  );

  assert.ok(resources.resources.some((resource) => resource.uri === "explorers-map://context/platform"));

  const resource = await client.request(
    {
      method: "resources/read",
      params: {
        uri: "explorers-map://context/editorial-rules",
      },
    },
    ReadResourceResultSchema,
  );

  const firstContent = resource.contents[0];
  assert.ok(firstContent);
  assert.equal(firstContent.uri, "explorers-map://context/editorial-rules");
  assert.match("text" in firstContent ? firstContent.text ?? "" : "", /Editorial Rules/i);
});

test("MCP tools enforce evidence, stop on ambiguity-like candidates, and return structured errors", async (t) => {
  const server = createMcpHttpServer({
    host: "127.0.0.1",
    port: 0,
    authToken: token,
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  const client = new Client(
    {
      name: "mcp-test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  await client.connect(transport);
  t.after(async () => {
    await client.close();
  });

  const candidateResult = await client.request(
    {
      method: "tools/call",
      params: {
        name: "find_destination",
        arguments: {
          countrySlug: "united-kingdom",
          query: "Peak District",
        },
      },
    },
    CallToolResultSchema,
  );

  assert.ok(!candidateResult.isError);
  assert.match(JSON.stringify(candidateResult.structuredContent ?? {}), /candidate_matches/);

  const insufficientEvidence = await client.request(
    {
      method: "tools/call",
      params: {
        name: "ensure_region",
        arguments: {
          countrySlug: "united-kingdom",
          title: "Unverified Region",
          description: "Should stop without evidence.",
          coverImage: "https://example.com/unverified-region.jpg",
        },
      },
    },
    CallToolResultSchema,
  );

  assert.ok(!insufficientEvidence.isError);
  assert.match(JSON.stringify(insufficientEvidence.structuredContent ?? {}), /insufficient_evidence/);

  const duplicateResult = await client.request(
    {
      method: "tools/call",
      params: {
        name: "create_listing_draft",
        arguments: {
          countrySlug: "united-kingdom",
          regionSlug: "dorset",
          title: "Durdle Door",
          shortDescription: "Duplicate title-derived slug.",
          description: "Should fail on duplicate protection.",
          latitude: 50.6212,
          longitude: -2.2763,
          busynessRating: 5,
          coverImage: "https://example.com/duplicate-durdle-door.jpg",
          categorySlug: "natural-attraction",
          evidence: [
            {
              label: "Editorial source",
              note: "Intentional duplicate-protection test.",
              url: "https://example.com/source",
            },
          ],
        },
      },
    },
    CallToolResultSchema,
  );

  assert.equal(duplicateResult.isError, true);
  assert.match(getResultText(duplicateResult), /CONFLICT/);
});
