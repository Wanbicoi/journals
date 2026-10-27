import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { runMigrations } from "./migrator.js";
import * as schema from "./schema.js";

export type DatabaseInstance = BunSQLiteDatabase<typeof schema>;

// @unit journals.db.init
// @summary Open the SQLite database and run migrations
export function initDb(dbPath: string, walMode = true, autoMigrate = true): DatabaseInstance {
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(dbPath);

  if (walMode && dbPath !== ":memory:") {
    sqlite.run("PRAGMA journal_mode = WAL;");
  }
  sqlite.run("PRAGMA foreign_keys = ON;");

  const db = drizzle(sqlite, { schema });

  if (autoMigrate) {
    // @call journals.db.migrate Apply pending migrations
    runMigrations(db);
  }

  return db;
}
