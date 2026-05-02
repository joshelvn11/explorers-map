CREATE TABLE `country_moderator_country_assignments` (
	`user_id` text NOT NULL,
	`country_id` text NOT NULL,
	`assigned_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`user_id`, `country_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `country_moderator_country_assignments_country_id_idx` ON `country_moderator_country_assignments` (`country_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cms_user_roles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "cms_user_roles_role_check" CHECK("__new_cms_user_roles"."role" in ('admin', 'country_moderator', 'moderator', 'viewer'))
);
--> statement-breakpoint
INSERT INTO `__new_cms_user_roles`("user_id", "role", "created_by", "updated_by", "created_at", "updated_at") SELECT "user_id", "role", "created_by", "updated_by", "created_at", "updated_at" FROM `cms_user_roles`;--> statement-breakpoint
DROP TABLE `cms_user_roles`;--> statement-breakpoint
ALTER TABLE `__new_cms_user_roles` RENAME TO `cms_user_roles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;