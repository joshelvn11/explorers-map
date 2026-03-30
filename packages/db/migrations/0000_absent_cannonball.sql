CREATE TABLE `categories` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`cover_image` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `countries_slug_unique` ON `countries` (`slug`);--> statement-breakpoint
CREATE TABLE `destination_regions` (
	`destination_id` text NOT NULL,
	`region_id` text NOT NULL,
	PRIMARY KEY(`destination_id`, `region_id`),
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `destination_regions_destination_id_idx` ON `destination_regions` (`destination_id`);--> statement-breakpoint
CREATE INDEX `destination_regions_region_id_idx` ON `destination_regions` (`region_id`);--> statement-breakpoint
CREATE TABLE `destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`country_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`cover_image` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `destinations_country_slug_unique` ON `destinations` (`country_id`,`slug`);--> statement-breakpoint
CREATE INDEX `destinations_country_id_idx` ON `destinations` (`country_id`);--> statement-breakpoint
CREATE TABLE `listing_destinations` (
	`listing_id` text NOT NULL,
	`destination_id` text NOT NULL,
	PRIMARY KEY(`listing_id`, `destination_id`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listing_destinations_listing_id_idx` ON `listing_destinations` (`listing_id`);--> statement-breakpoint
CREATE INDEX `listing_destinations_destination_id_idx` ON `listing_destinations` (`destination_id`);--> statement-breakpoint
CREATE TABLE `listing_images` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`image_url` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listing_images_listing_sort_order_unique` ON `listing_images` (`listing_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `listing_images_listing_image_url_unique` ON `listing_images` (`listing_id`,`image_url`);--> statement-breakpoint
CREATE INDEX `listing_images_listing_id_idx` ON `listing_images` (`listing_id`);--> statement-breakpoint
CREATE TABLE `listing_tags` (
	`listing_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`listing_id`, `tag_id`),
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listing_tags_listing_id_idx` ON `listing_tags` (`listing_id`);--> statement-breakpoint
CREATE INDEX `listing_tags_tag_id_idx` ON `listing_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`region_id` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`short_description` text NOT NULL,
	`description` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`busyness_rating` integer NOT NULL,
	`google_maps_place_url` text,
	`cover_image` text NOT NULL,
	`category_slug` text NOT NULL,
	`created_by` text,
	`updated_by` text,
	`source` text NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`category_slug`) REFERENCES `categories`(`slug`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "listings_status_check" CHECK("listings"."status" in ('draft', 'published')),
	CONSTRAINT "listings_busyness_rating_check" CHECK("listings"."busyness_rating" between 1 and 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_region_slug_unique` ON `listings` (`region_id`,`slug`);--> statement-breakpoint
CREATE INDEX `listings_region_id_idx` ON `listings` (`region_id`);--> statement-breakpoint
CREATE INDEX `listings_category_slug_idx` ON `listings` (`category_slug`);--> statement-breakpoint
CREATE INDEX `listings_coordinates_idx` ON `listings` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `listings_deleted_at_idx` ON `listings` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `regions` (
	`id` text PRIMARY KEY NOT NULL,
	`country_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`cover_image` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `regions_country_slug_unique` ON `regions` (`country_id`,`slug`);--> statement-breakpoint
CREATE INDEX `regions_country_id_idx` ON `regions` (`country_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);