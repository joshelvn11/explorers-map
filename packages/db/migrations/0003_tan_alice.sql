ALTER TABLE `cms_user_roles` ADD `created_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `cms_user_roles` ADD `updated_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `moderator_region_assignments` ADD `assigned_by` text REFERENCES user(id);