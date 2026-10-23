import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { DatabaseInstance } from "./client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations(db: DatabaseInstance, migrationsFolder?: string) {
  const folder = migrationsFolder || path.join(__dirname, "migrations");
  migrate(db, { migrationsFolder: folder });
}
