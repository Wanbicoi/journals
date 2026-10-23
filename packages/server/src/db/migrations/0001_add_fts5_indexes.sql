-- FTS5 Virtual Tables
CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  content,
  content='entries',
  content_rowid='rowid',
  tokenize='porter unicode61'
);
--> statement-breakpoint
CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
  name,
  content,
  content='projects',
  content_rowid='rowid',
  tokenize='porter unicode61'
);
--> statement-breakpoint
-- FTS5 Triggers for entries
CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, content) VALUES('delete', old.rowid, old.content);
  INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
END;
--> statement-breakpoint
-- FTS5 Triggers for projects
CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
  INSERT INTO projects_fts(rowid, name, content) VALUES (new.rowid, new.name, new.content);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
  INSERT INTO projects_fts(projects_fts, rowid, name, content) VALUES('delete', old.rowid, old.name, old.content);
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
  INSERT INTO projects_fts(projects_fts, rowid, name, content) VALUES('delete', old.rowid, old.name, old.content);
  INSERT INTO projects_fts(rowid, name, content) VALUES (new.rowid, new.name, new.content);
END;
