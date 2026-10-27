import { defineCommand } from "citty";
import { getDaemonStatus, startDaemon, stopDaemon } from "../daemon.js";

const startSubCommand = defineCommand({
  meta: {
    name: "start",
    description: "Start the background journals daemon server",
  },
  async run() {
    const res = await startDaemon();
    console.log(res.message);
    if (!res.success) {
      process.exit(1);
    }
  },
});

const stopSubCommand = defineCommand({
  meta: {
    name: "stop",
    description: "Stop the background journals daemon server",
  },
  async run() {
    const res = await stopDaemon();
    console.log(res.message);
    if (!res.success) {
      process.exit(1);
    }
  },
});

const restartSubCommand = defineCommand({
  meta: {
    name: "restart",
    description: "Restart the background journals daemon server",
  },
  async run() {
    console.log("Stopping daemon...");
    await stopDaemon();
    console.log("Starting daemon...");
    const res = await startDaemon();
    console.log(res.message);
    if (!res.success) {
      process.exit(1);
    }
  },
});

const statusSubCommand = defineCommand({
  meta: {
    name: "status",
    description: "Check the status of the background journals daemon server",
  },
  async run() {
    const status = await getDaemonStatus();
    console.log("Journals Daemon Status:");
    console.log(`  Target:     http://${status.host}:${status.port}`);
    console.log(`  Healthy:    ${status.healthy ? "yes" : "no"}`);
    console.log(`  Process:    ${status.running ? `running (PID: ${status.pid})` : "stopped"}`);
    console.log(`  PID File:   ${status.paths.pidFile}`);
    console.log(`  Log File:   ${status.paths.logFile}`);

    if (!status.healthy && status.running) {
      console.warn(`  Warning: Process ${status.pid} is running but health check failed.`);
      process.exit(1);
    }
  },
});

export const daemonCommand = defineCommand({
  meta: {
    name: "journals daemon",
    description: "Manage the background journals daemon server (start, stop, status, restart)",
  },
  subCommands: {
    start: startSubCommand,
    stop: stopSubCommand,
    restart: restartSubCommand,
    status: statusSubCommand,
  },
});

// @unit journals.cli.daemon
// @summary Run the daemon command line
// @details citty dispatches to the daemon subcommands, which start, stop, and
// | inspect the background server process.
export async function runDaemonCli(args: string[]): Promise<void> {
  const { runMain } = await import("citty");
  try {
    await runMain(daemonCommand, { rawArgs: args });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
