import { execFileSync } from "node:child_process";
import { defineCommand } from "citty";
import { getDaemonStatus, startDaemon, stopDaemon } from "../daemon.js";

const SYSTEMD_UNIT = "journals.service";

/**
 * A systemd-managed daemon has no PID file and must be controlled through the
 * service manager, not by spawning another detached process.
 */
function systemdActive(): boolean {
  try {
    execFileSync("systemctl", ["is-active", "--quiet", SYSTEMD_UNIT], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function systemdHint(action: "start" | "stop" | "restart"): string {
  return `Journals is managed by systemd (${SYSTEMD_UNIT}); use: sudo systemctl ${action} journals`;
}

const startSubCommand = defineCommand({
  meta: {
    name: "start",
    description: "Start the background journals daemon server",
  },
  async run() {
    if (systemdActive()) {
      console.log(systemdHint("start"));
      return;
    }
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
    if (systemdActive()) {
      console.log(systemdHint("stop"));
      return;
    }
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
    if (systemdActive()) {
      console.log(systemdHint("restart"));
      return;
    }
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
    const managed = systemdActive();
    console.log("Journals Daemon Status:");
    console.log(`  Target:     http://${status.host}:${status.port}`);
    console.log(`  Healthy:    ${status.healthy ? "yes" : "no"}`);
    if (managed) {
      console.log(`  Managed by: systemd (${SYSTEMD_UNIT})`);
    } else {
      console.log(`  Process:    ${status.running ? `running (PID: ${status.pid})` : "stopped"}`);
      console.log(`  PID File:   ${status.paths.pidFile}`);
      console.log(`  Log File:   ${status.paths.logFile}`);
    }

    if (!managed && !status.healthy && status.running) {
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
