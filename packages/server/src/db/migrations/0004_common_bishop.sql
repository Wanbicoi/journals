PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`content` text NOT NULL,
	`break_days` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_entries`("id", "project_id", "content", "break_days", "created_at", "updated_at") SELECT "id", "project_id", "content", 0, "created_at", "updated_at" FROM `entries`;--> statement-breakpoint
DROP TRIGGER IF EXISTS entries_ai;--> statement-breakpoint
DROP TRIGGER IF EXISTS entries_ad;--> statement-breakpoint
DROP TRIGGER IF EXISTS entries_au;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, content) VALUES('delete', old.rowid, old.content);
  INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `projects` ADD `recurrence` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `missed_policy` text DEFAULT 'spike' NOT NULL;

