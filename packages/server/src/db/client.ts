import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.js";

export type DatabaseInstance = BunSQLiteDatabase<typeof schema>;

export function initDb(dbPath: string, walMode = true): DatabaseInstance {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);

  if (walMode) {
    sqlite.run("PRAGMA journal_mode = WAL;");
  }
  sqlite.run("PRAGMA foreign_keys = ON;");

  // Create tables if not exist (minimal self-contained initialization)
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_quick_capture INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      tag_name TEXT NOT NULL REFERENCES tags(name) ON DELETE CASCADE ON UPDATE CASCADE,
      PRIMARY KEY (entry_id, tag_name)
    );

    -- FTS5 Virtual Tables
    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
      content,
      content='entries',
      content_rowid='rowid',
      tokenize='porter unicode61'
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
      name,
      content,
      content='projects',
      content_rowid='rowid',
      tokenize='porter unicode61'
    );

    -- FTS5 Triggers for entries
    CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
      INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
      INSERT INTO entries_fts(entries_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
      INSERT INTO entries_fts(entries_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
    END;

    -- FTS5 Triggers for projects
    CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
      INSERT INTO projects_fts(rowid, name, content) VALUES (new.rowid, new.name, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
      INSERT INTO projects_fts(projects_fts, rowid, name, content) VALUES('delete', old.rowid, old.name, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
      INSERT INTO projects_fts(projects_fts, rowid, name, content) VALUES('delete', old.rowid, old.name, old.content);
      INSERT INTO projects_fts(rowid, name, content) VALUES (new.rowid, new.name, new.content);
    END;
  `);

  return drizzle(sqlite, { schema });
}
