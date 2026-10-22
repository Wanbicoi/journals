import type { ServerType } from "@hono/node-server";
import { serve } from "@hono/node-server";
import { loadConfig, resolveDbPath } from "@journals/core";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { createApp, type AppType } from "./app.js";
import { initDb, type DatabaseInstance } from "./db/client.js";

export * from "./app.js";
export * from "./db/client.js";

export interface StartedServer {
  server: ServerType;
  app: AppType;
  db: DatabaseInstance;
  sqlite: BetterSqliteDatabase;
}

export function startServer(customConfigPath?: string): StartedServer {
  const config = loadConfig(customConfigPath);
  const dbPath = resolveDbPath(config.server.db_path);

  const { db, sqlite } = initDb(dbPath, config.server.wal_mode);
  const app = createApp(db, sqlite);

  const server = serve({
    fetch: app.fetch,
    port: config.server.port,
    hostname: config.server.host,
  });

  console.log(`[journals-server] Running on http://${config.server.host}:${config.server.port}`);
  console.log(`[journals-server] SQLite DB: ${dbPath}`);

  return { server, app, db, sqlite };
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
