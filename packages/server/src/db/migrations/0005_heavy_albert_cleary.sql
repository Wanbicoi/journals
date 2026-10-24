CREATE TABLE IF NOT EXISTS `periodic_reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`period_type` text NOT NULL,
	`period_key` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `periodic_reflections_period_key_unique` ON `periodic_reflections` (`period_key`);
