PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`country_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`cover_image` text,
	`created_by` text,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_destinations`("id", "country_id", "slug", "title", "description", "cover_image", "created_by", "updated_by", "created_at", "updated_at") SELECT "id", "country_id", "slug", "title", "description", "cover_image", "created_by", "updated_by", "created_at", "updated_at" FROM `destinations`;--> statement-breakpoint
DROP TABLE `destinations`;--> statement-breakpoint
ALTER TABLE `__new_destinations` RENAME TO `destinations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `destinations_country_slug_unique` ON `destinations` (`country_id`,`slug`);--> statement-breakpoint
CREATE INDEX `destinations_country_id_idx` ON `destinations` (`country_id`);--> statement-breakpoint
CREATE TABLE `__new_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`region_id` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`short_description` text NOT NULL,
	`description` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`busyness_rating` integer,
	`google_maps_place_url` text,
	`cover_image` text,
	`category_slug` text,
	`created_by` text,
	`updated_by` text,
	`source` text NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`category_slug`) REFERENCES `categories`(`slug`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "listings_status_check" CHECK("__new_listings"."status" in ('draft', 'published')),
	CONSTRAINT "listings_busyness_rating_check" CHECK("__new_listings"."busyness_rating" between 1 and 5)
);
--> statement-breakpoint
INSERT INTO `__new_listings`("id", "region_id", "slug", "status", "title", "short_description", "description", "latitude", "longitude", "busyness_rating", "google_maps_place_url", "cover_image", "category_slug", "created_by", "updated_by", "source", "deleted_at", "created_at", "updated_at") SELECT "id", "region_id", "slug", "status", "title", "short_description", "description", "latitude", "longitude", "busyness_rating", "google_maps_place_url", "cover_image", "category_slug", "created_by", "updated_by", "source", "deleted_at", "created_at", "updated_at" FROM `listings`;--> statement-breakpoint
DROP TABLE `listings`;--> statement-breakpoint
ALTER TABLE `__new_listings` RENAME TO `listings`;--> statement-breakpoint
CREATE UNIQUE INDEX `listings_region_slug_unique` ON `listings` (`region_id`,`slug`);--> statement-breakpoint
CREATE INDEX `listings_region_id_idx` ON `listings` (`region_id`);--> statement-breakpoint
CREATE INDEX `listings_category_slug_idx` ON `listings` (`category_slug`);--> statement-breakpoint
CREATE INDEX `listings_coordinates_idx` ON `listings` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `listings_deleted_at_idx` ON `listings` (`deleted_at`);