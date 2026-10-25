#!/usr/bin/env node
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { runAgentCli } from "./cli/agent.js";
import { runDaemonCli } from "./cli/daemon.js";
import { queryClient } from "./queryClient.js";

async function main() {
  const args = process.argv.slice(2);

  // If invoked with "daemon" subcommand, route to daemon CLI
  if (args[0] === "daemon") {
    await runDaemonCli(args.slice(1));
    process.exit(0);
  }

  // If invoked with "agent" subcommand, route to headless agent CLI
  if (args[0] === "agent") {
    await runAgentCli(args.slice(1));
    process.exit(0);
  }

  // Ensure server is started in-process if not running, avoiding detached background daemon
  const { startServer } = await import("@journals/server");
  const { serverUrl } = await import("./api/client.js");

  let serverInstance: { server: { stop: () => void } } | null = null;
  try {
    const testRes = await fetch(`${serverUrl}/health`);
    if (!testRes.ok) throw new Error("not running");
  } catch {
    // Start local server directly in the same runtime process silently
    serverInstance = startServer(undefined, { silent: true });
  }

  const cleanupServer = () => {
    if (serverInstance) {
      try {
        serverInstance.server.stop();
      } catch {}
      serverInstance = null;
    }
  };

  process.on("exit", cleanupServer);
  process.on("SIGINT", () => {
    cleanupServer();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanupServer();
    process.exit(0);
  });

  const { App } = await import("./views/App.js");

  if (!process.stdin.isTTY) {
    cleanupServer();
    console.error(
      "Error: Journals TUI requires an interactive TTY terminal.\n" +
        "To test or interact headlessly, use the automated interaction script:\n" +
        '  python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "1" "q"\n' +
        "Or use headless agent commands:\n" +
        "  journals agent --help\n",
    );
    process.exit(1);
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  });

  const root = createRoot(renderer);
  const quit = () => {
    cleanupServer();
    process.exit(0);
  };
  root.render(
    <QueryClientProvider client={queryClient}>
      <App onQuit={quit} />
    </QueryClientProvider>,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
