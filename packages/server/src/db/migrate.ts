import { loadConfig, resolveDbPath } from "@journals/core";
import { initDb } from "./client.js";
import { runMigrations } from "./migrator.js";

const config = loadConfig();
const dbPath = resolveDbPath(config.server.db_path);
const db = initDb(dbPath, config.server.wal_mode, false);
console.log(`Running migrations on ${dbPath}...`);
runMigrations(db);
console.log("Migrations applied successfully.");
