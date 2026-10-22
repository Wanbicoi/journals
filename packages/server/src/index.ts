import { loadConfig, resolveDbPath } from "@journals/core";
import type { Server } from "bun";
import { type AppType, createApp } from "./app.js";
import { type DatabaseInstance, type SQLiteDatabase, initDb } from "./db/client.js";

export * from "./app.js";
export * from "./db/client.js";

export interface StartedServer {
  server: Server<unknown>;
  app: AppType;
  db: DatabaseInstance;
  sqlite: SQLiteDatabase;
}

export function startServer(customConfigPath?: string): StartedServer {
  const config = loadConfig(customConfigPath);
  const dbPath = resolveDbPath(config.server.db_path);

  const { db, sqlite } = initDb(dbPath, config.server.wal_mode);
  const app = createApp(db, sqlite);

  const server = Bun.serve({
    fetch: app.fetch,
    port: config.server.port,
    hostname: config.server.host,
  });

  console.log(`[journals-server] Running on http://${config.server.host}:${config.server.port}`);
  console.log(`[journals-server] SQLite DB: ${dbPath}`);

  return { server, app, db, sqlite };
}

// Auto-run if executed directly
if (import.meta.main) {
  startServer();
}
