import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const listingStatusValues = ["draft", "published"] as const;
export type ListingStatus = (typeof listingStatusValues)[number];

const currentTimestamp = sql`(unixepoch())`;

export const countries = sqliteTable(
  "countries",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    coverImage: text("cover_image").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
  },
  (table) => [uniqueIndex("countries_slug_unique").on(table.slug)],
);

export const regions = sqliteTable(
  "regions",
  {
    id: text("id").primaryKey(),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "restrict", onUpdate: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    coverImage: text("cover_image").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("regions_country_slug_unique").on(table.countryId, table.slug),
    index("regions_country_id_idx").on(table.countryId),
  ],
);

export const destinations = sqliteTable(
  "destinations",
  {
    id: text("id").primaryKey(),
    countryId: text("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "restrict", onUpdate: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    coverImage: text("cover_image").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("destinations_country_slug_unique").on(table.countryId, table.slug),
    index("destinations_country_id_idx").on(table.countryId),
  ],
);

export const destinationRegions = sqliteTable(
  "destination_regions",
  {
    destinationId: text("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.destinationId, table.regionId] }),
    index("destination_regions_destination_id_idx").on(table.destinationId),
    index("destination_regions_region_id_idx").on(table.regionId),
  ],
);

export const categories = sqliteTable("categories", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
});

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("tags_slug_unique").on(table.slug),
    uniqueIndex("tags_name_unique").on(table.name),
  ],
);

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "restrict", onUpdate: "cascade" }),
    slug: text("slug").notNull(),
    status: text("status", { enum: listingStatusValues }).notNull(),
    title: text("title").notNull(),
    shortDescription: text("short_description").notNull(),
    description: text("description").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    busynessRating: integer("busyness_rating").notNull(),
    googleMapsPlaceUrl: text("google_maps_place_url"),
    coverImage: text("cover_image").notNull(),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug, { onDelete: "restrict", onUpdate: "cascade" }),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    source: text("source").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("listings_region_slug_unique").on(table.regionId, table.slug),
    index("listings_region_id_idx").on(table.regionId),
    index("listings_category_slug_idx").on(table.categorySlug),
    index("listings_coordinates_idx").on(table.latitude, table.longitude),
    index("listings_deleted_at_idx").on(table.deletedAt),
    check("listings_status_check", sql`${table.status} in ('draft', 'published')`),
    check("listings_busyness_rating_check", sql`${table.busynessRating} between 1 and 5`),
  ],
);

export const listingDestinations = sqliteTable(
  "listing_destinations",
  {
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade", onUpdate: "cascade" }),
    destinationId: text("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.destinationId] }),
    index("listing_destinations_listing_id_idx").on(table.listingId),
    index("listing_destinations_destination_id_idx").on(table.destinationId),
  ],
);

export const listingImages = sqliteTable(
  "listing_images",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade", onUpdate: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex("listing_images_listing_sort_order_unique").on(table.listingId, table.sortOrder),
    uniqueIndex("listing_images_listing_image_url_unique").on(table.listingId, table.imageUrl),
    index("listing_images_listing_id_idx").on(table.listingId),
  ],
);

export const listingTags = sqliteTable(
  "listing_tags",
  {
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade", onUpdate: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.listingId, table.tagId] }),
    index("listing_tags_listing_id_idx").on(table.listingId),
    index("listing_tags_tag_id_idx").on(table.tagId),
  ],
);

export const countriesRelations = relations(countries, ({ many }) => ({
  regions: many(regions),
  destinations: many(destinations),
}));

export const regionsRelations = relations(regions, ({ one, many }) => ({
  country: one(countries, {
    fields: [regions.countryId],
    references: [countries.id],
  }),
  destinationRegions: many(destinationRegions),
  listings: many(listings),
}));

export const destinationsRelations = relations(destinations, ({ one, many }) => ({
  country: one(countries, {
    fields: [destinations.countryId],
    references: [countries.id],
  }),
  destinationRegions: many(destinationRegions),
  listingDestinations: many(listingDestinations),
}));

export const destinationRegionsRelations = relations(destinationRegions, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationRegions.destinationId],
    references: [destinations.id],
  }),
  region: one(regions, {
    fields: [destinationRegions.regionId],
    references: [regions.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  listings: many(listings),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  listingTags: many(listingTags),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  region: one(regions, {
    fields: [listings.regionId],
    references: [regions.id],
  }),
  category: one(categories, {
    fields: [listings.categorySlug],
    references: [categories.slug],
  }),
  listingDestinations: many(listingDestinations),
  images: many(listingImages),
  listingTags: many(listingTags),
}));

export const listingDestinationsRelations = relations(listingDestinations, ({ one }) => ({
  listing: one(listings, {
    fields: [listingDestinations.listingId],
    references: [listings.id],
  }),
  destination: one(destinations, {
    fields: [listingDestinations.destinationId],
    references: [destinations.id],
  }),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, {
    fields: [listingImages.listingId],
    references: [listings.id],
  }),
}));

export const listingTagsRelations = relations(listingTags, ({ one }) => ({
  listing: one(listings, {
    fields: [listingTags.listingId],
    references: [listings.id],
  }),
  tag: one(tags, {
    fields: [listingTags.tagId],
    references: [tags.id],
  }),
}));
