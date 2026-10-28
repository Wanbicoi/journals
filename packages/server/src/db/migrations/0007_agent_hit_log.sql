CREATE TABLE `hit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_entry_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agent_entry_id`) REFERENCES `agent_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hit_log_agent_entry_idx` ON `hit_log` (`agent_entry_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `agent_entries` ADD `previous_agent_entry_id` text REFERENCES agent_entries(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `agent_entries` DROP COLUMN `hit_time`;