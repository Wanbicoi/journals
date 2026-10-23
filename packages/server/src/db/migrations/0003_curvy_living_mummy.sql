CREATE TABLE `agent_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`content` text NOT NULL,
	`hit_time` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- FTS5 Virtual Table for agent_entries
CREATE VIRTUAL TABLE IF NOT EXISTS agent_entries_fts USING fts5(
  content,
  content='agent_entries',
  content_rowid='rowid',
  tokenize='porter unicode61'
);
--> statement-breakpoint
-- FTS5 Triggers for agent_entries
CREATE TRIGGER IF NOT EXISTS agent_entries_ai AFTER INSERT ON agent_entries BEGIN
  INSERT INTO agent_entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS agent_entries_ad AFTER DELETE ON agent_entries BEGIN
  INSERT INTO agent_entries_fts(agent_entries_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS agent_entries_au AFTER UPDATE ON agent_entries BEGIN
  INSERT INTO agent_entries_fts(agent_entries_fts, rowid, content) VALUES('delete', old.rowid, old.content);
  INSERT INTO agent_entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;
