import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDb,
} from "../packages/db/index.ts";
import {
  buildSeedSummary,
  importPreparedSeedData,
  loadSeedData,
  prepareSeedData,
  validateSeedData,
  type SeedData,
} from "../packages/services/seed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function makeScopedKey(...parts: Array<string | number>) {
  return parts.join("::");
}

function expectThrows(action: () => void, expectedMessage: string) {
  let thrown = false;

  try {
    action();
  } catch (error) {
    thrown = true;
    assert(
      error instanceof Error && error.message.includes(expectedMessage),
      `Expected error including "${expectedMessage}", received "${error instanceof Error ? error.message : String(error)}"`,
    );
  }

  assert(thrown, `Expected validation error including "${expectedMessage}"`);
}

function cloneSeedData(): SeedData {
  return structuredClone(loadSeedData());
}

function runDbMigrate(dbPath: string) {
  const result = spawnSync("pnpm", ["db:migrate"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      EXPLORERS_MAP_SQLITE_PATH: dbPath,
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `db:migrate failed with exit code ${result.status ?? "unknown"}\n${result.stdout}\n${result.stderr}`,
    );
  }
}

function getTableCount(sqlite: ReturnType<typeof createDb>["sqlite"], tableName: string) {
  const row = sqlite.prepare(`select count(*) as count from ${tableName}`).get() as { count: number };
  return Number(row.count);
}

function getCounts(sqlite: ReturnType<typeof createDb>["sqlite"]) {
  return {
    countries: getTableCount(sqlite, "countries"),
    regions: getTableCount(sqlite, "regions"),
    destinations: getTableCount(sqlite, "destinations"),
    destinationRegions: getTableCount(sqlite, "destination_regions"),
    categories: getTableCount(sqlite, "categories"),
    tags: getTableCount(sqlite, "tags"),
    listings: getTableCount(sqlite, "listings"),
    listingDestinations: getTableCount(sqlite, "listing_destinations"),
    listingImages: getTableCount(sqlite, "listing_images"),
    listingTags: getTableCount(sqlite, "listing_tags"),
  };
}

function assertValidationCoverage() {
  const duplicateListingSlug = cloneSeedData();
  duplicateListingSlug.listings[1] = {
    ...duplicateListingSlug.listings[1],
    regionSlug: duplicateListingSlug.listings[0].regionSlug,
    slug: duplicateListingSlug.listings[0].slug,
  };
  expectThrows(() => validateSeedData(duplicateListingSlug), "Duplicate listing slug within region");

  const missingRegion = cloneSeedData();
  missingRegion.listingImages[0] = {
    ...missingRegion.listingImages[0],
    regionSlug: "missing-region",
  };
  expectThrows(() => validateSeedData(missingRegion), "Unknown listing in listingImages");

  const duplicateSortOrder = cloneSeedData();
  duplicateSortOrder.listingImages[1] = {
    ...duplicateSortOrder.listingImages[1],
    sortOrder: duplicateSortOrder.listingImages[0].sortOrder,
  };
  expectThrows(() => validateSeedData(duplicateSortOrder), "Duplicate listing image sort order");

  const invalidStatus = cloneSeedData();
  invalidStatus.listings[0] = {
    ...invalidStatus.listings[0],
    status: "archived",
  };
  expectThrows(() => validateSeedData(invalidStatus), "must be one of: draft, published");

  const invalidBusyness = cloneSeedData();
  invalidBusyness.listings[0] = {
    ...invalidBusyness.listings[0],
    busynessRating: 6,
  };
  expectThrows(() => validateSeedData(invalidBusyness), "must be between 1 and 5");
}

function assertSummariesMatch(actual: ReturnType<typeof getCounts>, expected: ReturnType<typeof buildSeedSummary>, label: string) {
  for (const [key, value] of Object.entries(expected)) {
    assert(
      actual[key as keyof typeof actual] === value,
      `${label}: expected ${key}=${value}, received ${actual[key as keyof typeof actual]}`,
    );
  }
}

function main() {
  assertValidationCoverage();

  const preparedSeedData = prepareSeedData(loadSeedData());
  const expectedSummary = buildSeedSummary(preparedSeedData);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "explorers-map-seed-smoke-"));
  const dbPath = path.join(tempDir, "explorers-map.sqlite");
  const dbInstance = createDb(dbPath);

  try {
    runDbMigrate(dbPath);

    importPreparedSeedData(preparedSeedData, dbInstance);

    const firstRunCounts = getCounts(dbInstance.sqlite);
    assertSummariesMatch(firstRunCounts, expectedSummary, "first seed run");

    importPreparedSeedData(preparedSeedData, dbInstance);

    const secondRunCounts = getCounts(dbInstance.sqlite);
    assertSummariesMatch(secondRunCounts, expectedSummary, "second seed run");

    const representativeTag = dbInstance.sqlite
      .prepare("select slug from tags where id = ?")
      .get("tag-coastal") as { slug?: string } | undefined;
    assert(representativeTag?.slug === "coastal", "Expected seeded tag tag-coastal to persist across reruns");

    const representativeListing = dbInstance.sqlite
      .prepare("select id, status, source, deleted_at as deletedAt from listings where id = ?")
      .get("listing-durdle-door") as
      | { id?: string; status?: string; source?: string; deletedAt?: number | null }
      | undefined;
    assert(representativeListing?.status === "published", "Expected seeded listing status default to persist");
    assert(representativeListing?.source === "seed", "Expected seeded listing source default to persist");
    assert(representativeListing?.deletedAt === null, "Expected seeded listing deletedAt to default to null");

    const representativeImage = dbInstance.sqlite
      .prepare("select sort_order as sortOrder from listing_images where id = ?")
      .get("listing-image-durdle-door-2") as { sortOrder?: number } | undefined;
    assert(representativeImage?.sortOrder === 2, "Expected listing image sort order to match the seed source");

    const durdleDoorListingId = representativeListing?.id;
    assert(durdleDoorListingId, "Expected representative listing to exist for relationship assertions");

    const listingDestinationCount = dbInstance.sqlite
      .prepare("select count(*) as count from listing_destinations where listing_id = ?")
      .get(durdleDoorListingId) as { count: number };
    assert(Number(listingDestinationCount.count) === 1, "Expected Durdle Door to keep exactly one seeded destination link");

    const listingTagCount = dbInstance.sqlite
      .prepare("select count(*) as count from listing_tags where listing_id = ?")
      .get(durdleDoorListingId) as { count: number };
    assert(Number(listingTagCount.count) === 3, "Expected Durdle Door to keep exactly three seeded tag links");

    const listingImageCount = dbInstance.sqlite
      .prepare("select count(*) as count from listing_images where listing_id = ?")
      .get(durdleDoorListingId) as { count: number };
    assert(Number(listingImageCount.count) === 2, "Expected Durdle Door to keep exactly two seeded gallery rows");

    console.log("Seed smoke test passed.");
    console.log(`Temp database: ${dbPath}`);
    console.log("");
    console.log("Verified:");
    console.log("- validation failures for duplicate slugs, missing references, duplicate image sort order, invalid status, and invalid busyness");
    console.log("- fresh-database migration and import");
    console.log("- idempotent rerun counts");
    console.log(`- representative stable IDs and relationships for ${makeScopedKey("dorset", "durdle-door")}`);
  } finally {
    dbInstance.sqlite.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
