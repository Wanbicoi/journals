#!/usr/bin/env node
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { runAgentCli } from "./cli/agent.js";
import { runDaemonCli } from "./cli/daemon.js";

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

  const { App } = await import("./views/App.js");

  if (!process.stdin.isTTY) {
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
  root.render(<App />);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
