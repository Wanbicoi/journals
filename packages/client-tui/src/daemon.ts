import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type Config, loadConfig } from "@journals/core";

export interface DaemonPaths {
  dir: string;
  pidFile: string;
  logFile: string;
}

export function getDaemonPaths(config?: Config): DaemonPaths {
  const cfg = config ?? loadConfig();
  // Derive base directory from configured db_path directory or fallback to ~/.local/share/journals
  let dir = path.join(os.homedir(), ".local", "share", "journals");
  if (cfg.server.db_path) {
    let resolvedDb = cfg.server.db_path;
    if (resolvedDb.startsWith("~/") || resolvedDb === "~") {
      resolvedDb = path.join(os.homedir(), resolvedDb.slice(resolvedDb === "~" ? 1 : 2));
    }
    dir = path.dirname(path.resolve(resolvedDb));
  }

  return {
    dir,
    pidFile: path.join(dir, "server.pid"),
    logFile: path.join(dir, "server.log"),
  };
}

export function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readDaemonPid(pidFile: string): number | null {
  if (!fs.existsSync(pidFile)) {
    return null;
  }
  try {
    const content = fs.readFileSync(pidFile, "utf-8").trim();
    const pid = Number.parseInt(content, 10);
    if (Number.isNaN(pid) || pid <= 0) return null;
    return pid;
  } catch {
    return null;
  }
}

export async function checkServerHealth(
  host: string,
  port: number,
  timeoutMs = 1000,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://${host}:${port}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function startDaemon(
  config?: Config,
  _options: { silent?: boolean } = {},
): Promise<{ success: boolean; pid?: number; message: string }> {
  const cfg = config ?? loadConfig();
  const paths = getDaemonPaths(cfg);

  fs.mkdirSync(paths.dir, { recursive: true });

  const existingPid = readDaemonPid(paths.pidFile);
  const isHealthy = await checkServerHealth(cfg.server.host, cfg.server.port, 500);

  if (existingPid && isPidRunning(existingPid)) {
    if (isHealthy) {
      return {
        success: true,
        pid: existingPid,
        message: `Daemon is already running (PID: ${existingPid}) on http://${cfg.server.host}:${cfg.server.port}`,
      };
    }
    // Process is alive but not answering health check, or stale
  } else if (isHealthy) {
    return {
      success: true,
      message: `Journals server is already running on http://${cfg.server.host}:${cfg.server.port}`,
    };
  }

  // Clean stale PID file if present
  if (fs.existsSync(paths.pidFile)) {
    try {
      fs.unlinkSync(paths.pidFile);
    } catch {}
  }

  // Locate server entry point
  // 1. Try relative to imported @journals/server module
  let serverEntry: string | undefined;
  try {
    const resolvedServer = import.meta.resolve("@journals/server");
    const serverPath = new URL(resolvedServer).pathname;
    serverEntry = serverPath;
  } catch {
    // fallback to source file if in repo
    serverEntry = path.resolve(process.cwd(), "packages", "server", "src", "index.ts");
  }

  const logFd = fs.openSync(paths.logFile, "a");

  const child = spawn(process.execPath, [serverEntry], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
    },
  });

  if (!child.pid) {
    fs.closeSync(logFd);
    return { success: false, message: "Failed to spawn daemon process." };
  }

  fs.writeFileSync(paths.pidFile, String(child.pid), "utf-8");
  child.unref();
  fs.closeSync(logFd);

  // Poll for up to 3 seconds for health check
  const start = Date.now();
  let online = false;
  while (Date.now() - start < 3000) {
    if (await checkServerHealth(cfg.server.host, cfg.server.port, 300)) {
      online = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  if (online) {
    return {
      success: true,
      pid: child.pid,
      message: `Journals daemon started successfully (PID: ${child.pid}) on http://${cfg.server.host}:${cfg.server.port}`,
    };
  }

  return {
    success: false,
    pid: child.pid,
    message: `Daemon spawned (PID: ${child.pid}) but failed to respond to /health. Check logs at ${paths.logFile}`,
  };
}

export async function stopDaemon(config?: Config): Promise<{ success: boolean; message: string }> {
  const cfg = config ?? loadConfig();
  const paths = getDaemonPaths(cfg);
  const pid = readDaemonPid(paths.pidFile);

  if (!pid) {
    // Check if running anyway
    const isHealthy = await checkServerHealth(cfg.server.host, cfg.server.port, 300);
    if (!isHealthy) {
      return { success: true, message: "Daemon is not running." };
    }
    return {
      success: false,
      message: `Server is responding on port ${cfg.server.port} but no PID file found at ${paths.pidFile}. Stop it manually.`,
    };
  }

  if (!isPidRunning(pid)) {
    if (fs.existsSync(paths.pidFile)) {
      fs.unlinkSync(paths.pidFile);
    }
    return { success: true, message: "Daemon was not running (cleaned stale PID file)." };
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch (err) {
    return { success: false, message: `Failed to signal process ${pid}: ${String(err)}` };
  }

  // Wait up to 3 seconds for exit
  const start = Date.now();
  while (Date.now() - start < 3000) {
    if (!isPidRunning(pid)) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  if (isPidRunning(pid)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }

  if (fs.existsSync(paths.pidFile)) {
    try {
      fs.unlinkSync(paths.pidFile);
    } catch {}
  }

  return { success: true, message: `Journals daemon stopped (PID: ${pid}).` };
}

export async function getDaemonStatus(config?: Config): Promise<{
  running: boolean;
  pid: number | null;
  healthy: boolean;
  paths: DaemonPaths;
  host: string;
  port: number;
}> {
  const cfg = config ?? loadConfig();
  const paths = getDaemonPaths(cfg);
  const pid = readDaemonPid(paths.pidFile);
  const running = pid !== null && isPidRunning(pid);
  const healthy = await checkServerHealth(cfg.server.host, cfg.server.port, 500);

  return {
    running,
    pid,
    healthy,
    paths,
    host: cfg.server.host,
    port: cfg.server.port,
  };
}
