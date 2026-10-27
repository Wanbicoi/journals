#!/usr/bin/env node
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { runAgentCli } from "./cli/agent.js";
import { runDaemonCli } from "./cli/daemon.js";
import { IconProvider } from "./contexts/icons.js";
import { KeymapProvider } from "./contexts/keymaps.js";
import { ThemeProvider } from "./contexts/theme.js";
import { queryClient } from "./queryClient.js";
import { getTheme } from "./theme.js";

// @unit journals.tui
// @summary Journals terminal client
async function main() {
  const args = process.argv.slice(2);

  // If invoked with "daemon" subcommand, route to daemon CLI
  if (args[0] === "daemon") {
    // @call journals.cli.daemon Run the daemon command line
    await runDaemonCli(args.slice(1));
    process.exit(0);
  }

  // If invoked with "agent" subcommand, route to headless agent CLI
  if (args[0] === "agent") {
    // @call journals.cli.agent Run the headless agent command line
    await runAgentCli(args.slice(1));
    process.exit(0);
  }

  // Ensure server is started in-process if not running, avoiding detached background daemon
  const { startServer } = await import("@journals/server");
  const { config, serverUrl } = await import("./api/client.js");

  let serverInstance: { server: { stop: () => void } } | null = null;
  // @call journals.server.start Start the in-process API server when it is not running
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
  const theme = getTheme(config.appearance.theme);
  const icons = config.appearance.use_nerd_font ? config.icons.nerd : config.icons.plain;
  // @call journals.app Render the application
  root.render(
    <ThemeProvider theme={theme} dayStartHour={config.appearance.day_start_hour ?? 0}>
      <IconProvider value={icons}>
        <KeymapProvider value={config.keymaps}>
          <QueryClientProvider client={queryClient}>
            <App onQuit={quit} />
          </QueryClientProvider>
        </KeymapProvider>
      </IconProvider>
    </ThemeProvider>,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
