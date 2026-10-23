import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "yaml";
import { z } from "zod";

export const ConfigSchema = z.object({
  appearance: z
    .object({
      use_nerd_font: z.boolean().default(true),
      theme: z.string().default("rose-pine-dawn"),
      date_format: z.string().default("YYYY-MM-DD"),
      time_format: z.string().default("HH:mm"),
    })
    .default({}),
  icons: z
    .object({
      nerd: z.record(z.string()).default({
        journal: "",
        project: "",
        tag: "",
        calendar: "",
        quick: "",
        warning: "",
        trash: "",
        checked: "",
        unchecked: "",
        bullet: "",
      }),
      plain: z.record(z.string()).default({
        journal: "◆",
        project: "◫",
        tag: "#",
        calendar: "📅",
        quick: "⚡",
        warning: "!",
        trash: "x",
        checked: "[x]",
        unchecked: "[ ]",
        bullet: "•",
      }),
    })
    .default({}),
  keymaps: z
    .object({
      view_timeline: z.string().default("1"),
      view_projects: z.string().default("2"),
      up: z.string().default("k"),
      down: z.string().default("j"),
      quick_capture: z.string().default("n"),
      new_project: z.string().default("N"),
      edit_project: z.string().default("p"),
      edit_tags: z.string().default("t"),
      delete_entry: z.string().default("d"),
      edit_project_content: z.string().default("e"),
      search_filter: z.string().default("/"),
      help: z.string().default("?"),
      refresh: z.string().default("r"),
      cancel: z.string().default("escape"),
      quit: z.string().default("q"),
    })
    .default({}),
  defaults: z
    .object({
      project: z.string().default("Inbox"),
      tags: z.array(z.string()).default(["quick"]),
    })
    .default({}),
  server: z
    .object({
      host: z.string().default("127.0.0.1"),
      port: z.number().default(4321),
      db_path: z.string().default("~/.local/share/journals/data.sqlite"),
      wal_mode: z.boolean().default(true),
      auto_start: z.boolean().default(true),
    })
    .default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

let loadedConfigDir: string | undefined;

export function resolveDbPath(rawPath: string, baseDir?: string): string {
  if (rawPath.startsWith("~/") || rawPath === "~") {
    return path.join(os.homedir(), rawPath.slice(rawPath === "~" ? 1 : 2));
  }
  const root = baseDir || loadedConfigDir || process.cwd();
  return path.resolve(root, rawPath);
}

export function loadConfig(customPath?: string): Config {
  const envConfig = process.env.JOURNAL_CONFIG;
  const candidatePaths = [
    customPath ? path.resolve(customPath) : undefined,
    envConfig ? path.resolve(envConfig) : undefined,
    envConfig ? path.resolve(process.cwd(), "..", "..", envConfig) : undefined,
    path.join(process.cwd(), "journal.config.yaml"),
    path.join(process.cwd(), "configs", "journal.config.example.yaml"),
    path.join(process.cwd(), "..", "..", "journal.config.yaml"),
    path.join(process.cwd(), "..", "..", "configs", "journal.config.example.yaml"),
    path.join(os.homedir(), ".config", "journals", "config.yaml"),
  ].filter((p): p is string => Boolean(p));

  const foundPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!foundPath) {
    return ConfigSchema.parse({});
  }

  // If found config is inside a configs/ folder or repo root, store its parent or dir
  loadedConfigDir =
    path.basename(path.dirname(foundPath)) === "configs"
      ? path.resolve(path.dirname(foundPath), "..")
      : path.dirname(foundPath);

  const fileContent = fs.readFileSync(foundPath, "utf-8");
  const parsed = yaml.parse(fileContent);
  return ConfigSchema.parse(parsed || {});
}
