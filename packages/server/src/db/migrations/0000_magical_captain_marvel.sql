CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`content` text NOT NULL,
	`is_quick_capture` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entry_tags` (
	`entry_id` text NOT NULL,
	`tag_name` text NOT NULL,
	PRIMARY KEY(`entry_id`, `tag_name`),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_name`) REFERENCES `tags`(`name`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_name_unique` ON `projects` (`name`);--> statement-breakpoint
CREATE TABLE `tags` (
	`name` text PRIMARY KEY NOT NULL
);
