ALTER TABLE `destinations` ADD `created_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `destinations` ADD `updated_by` text REFERENCES user(id);