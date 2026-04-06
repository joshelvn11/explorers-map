import assert from "node:assert/strict";
import test from "node:test";

import { buildMetadata } from "./lib/metadata.ts";

test("buildMetadata tolerates missing destination cover images", () => {
  const metadata = buildMetadata({
    title: "Quiet Headlands",
    description: "Destination metadata should still render cleanly without a cover image.",
    image: undefined,
  });

  assert.equal((metadata.twitter as { card?: string } | undefined)?.card, "summary");
  assert.equal(metadata.openGraph?.images, undefined);
});
