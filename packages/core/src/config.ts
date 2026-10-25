import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "yaml";
import { z } from "zod";

/**
 * The complete set of glyphs the TUI can render. Every icon lives here so that
 * views never hardcode a glyph or carry their own fallback.
 */
export interface IconSet {
  journal: string;
  project: string;
  tag: string;
  calendar: string;
  quick: string;
  warning: string;
  trash: string;
  checked: string;
  unchecked: string;
  bullet: string;
  global: string;
  break: string;
  status: string;
  done: string;
  todo: string;
  pointer: string;
  cursor: string;
  target: string;
  overdue: string;
  chartUp: string;
  chartDown: string;
  chartCursor: string;
}

export const NERD_ICONS: IconSet = {
  journal: "\u{f442}",
  project: "\u{f401}",
  tag: "\u{f02c}",
  calendar: "\u{f455}",
  quick: "\u{f0e7}",
  warning: "\u{f071}",
  trash: "\u{f4bf}",
  checked: "\u{f4a7}",
  unchecked: "\u{f4a0}",
  bullet: "\u{f444}",
  global: "\u{f0ac}",
  break: "\u{f04c}",
  status: "\u{f111}",
  done: "\u{f058}",
  todo: "\u{f10c}",
  pointer: "\u{f054}",
  cursor: "\u{f0da}",
  target: "\u{f140}",
  overdue: "\u{f017}",
  chartUp: "\u{f062}",
  chartDown: "\u{f063}",
  chartCursor: "\u{f0d8}",
};

export const PLAIN_ICONS: IconSet = {
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
  global: "🌐",
  break: "⏸",
  status: "●",
  done: "●",
  todo: "○",
  pointer: "❯",
  cursor: "▎",
  target: "🎯",
  overdue: "⚠",
  chartUp: "▲",
  chartDown: "▼",
  chartCursor: "▲",
};

/**
 * Builds the icon schema from a default set. Each key falls back to its default
 * individually, so a user can override one icon without redeclaring the whole set.
 */
function iconSetSchema(defaults: IconSet) {
  return z.object({
    journal: z.string().default(defaults.journal),
    project: z.string().default(defaults.project),
    tag: z.string().default(defaults.tag),
    calendar: z.string().default(defaults.calendar),
    quick: z.string().default(defaults.quick),
    warning: z.string().default(defaults.warning),
    trash: z.string().default(defaults.trash),
    checked: z.string().default(defaults.checked),
    unchecked: z.string().default(defaults.unchecked),
    bullet: z.string().default(defaults.bullet),
    global: z.string().default(defaults.global),
    break: z.string().default(defaults.break),
    status: z.string().default(defaults.status),
    done: z.string().default(defaults.done),
    todo: z.string().default(defaults.todo),
    pointer: z.string().default(defaults.pointer),
    cursor: z.string().default(defaults.cursor),
    target: z.string().default(defaults.target),
    overdue: z.string().default(defaults.overdue),
    chartUp: z.string().default(defaults.chartUp),
    chartDown: z.string().default(defaults.chartDown),
    chartCursor: z.string().default(defaults.chartCursor),
  });
}

export const ConfigSchema = z.object({
  appearance: z
    .object({
      use_nerd_font: z.boolean().default(true),
      theme: z.string().default("rose-pine-dawn"),
      date_format: z.string().default("YYYY-MM-DD"),
      time_format: z.string().default("HH:mm"),
      day_start_hour: z.number().min(0).max(23).default(0),
    })
    .default({}),
  icons: z
    .object({
      nerd: iconSetSchema(NERD_ICONS).default({}),
      plain: iconSetSchema(PLAIN_ICONS).default({}),
    })
    .default({}),
  keymaps: z
    .object({
      view_dashboard: z.string().default("1"),
      view_timeline: z.string().default("2"),
      view_reflections: z.string().default("3"),
      view_projects: z.string().default("4"),
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
  quick_add: z
    .object({
      default_project: z.string().default("Inbox"),
    })
    .default({}),
  reflections: z
    .object({
      start_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "start_date must be in YYYY-MM-DD format")
        .default("2026-01-01"),
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
