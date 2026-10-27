import { loadConfig, resolveDbPath } from "@journals/core";
import type { Server } from "bun";
import { type AppType, createApp } from "./app.js";
import { type DatabaseInstance, initDb } from "./db/client.js";

export * from "./app.js";
export * from "./db/client.js";

export interface StartedServer {
  server: Server<unknown>;
  app: AppType;
  db: DatabaseInstance;
}

// @unit journals.server.start
// @summary Start the API server
export function startServer(
  customConfigPath?: string,
  options: { silent?: boolean } = {},
): StartedServer {
  // @call journals.core.config Load the YAML configuration
  const config = loadConfig(customConfigPath);
  // @call journals.core.db-path Resolve the SQLite path
  const dbPath = resolveDbPath(config.server.db_path);

  // @call journals.db.init Open the database and run migrations
  const db = initDb(dbPath, config.server.wal_mode);
  // @call journals.server.app Register the HTTP routes
  const app = createApp(db);

  const server = Bun.serve({
    fetch: app.fetch,
    port: config.server.port,
    hostname: config.server.host,
  });

  if (!options.silent) {
    console.log(`[journals-server] Running on http://${config.server.host}:${config.server.port}`);
    console.log(`[journals-server] SQLite DB: ${dbPath}`);
  }

  return { server, app, db };
}

// Auto-run if executed directly
if (import.meta.main) {
  startServer();
}
