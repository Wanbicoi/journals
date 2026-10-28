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
  overdue: string;
  chartUp: string;
  chartDown: string;
  chartCursor: string;
}

const NERD_ICONS: IconSet = {
  journal: "\u{f442}",
  project: "\u{f401}",
  tag: "\u{f02c}",
  calendar: "\u{f455}",
  quick: "\u{f0e7}",
  warning: "\u{f071}",
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
    overdue: z.string().default(defaults.overdue),
    chartUp: z.string().default(defaults.chartUp),
    chartDown: z.string().default(defaults.chartDown),
    chartCursor: z.string().default(defaults.chartCursor),
  });
}

/** One action may be bound to several keys: a letter and the arrow it mirrors. */
const BindingSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

export type Binding = z.infer<typeof BindingSchema>;

function binding(value: Binding) {
  return BindingSchema.default(value);
}

/**
 * Default keys, grouped by the screen that answers them. A scope owns its own bindings, so the
 * same action name (`down`, `quick_capture`) can appear in several scopes with the same or a
 * different key. The global scope is dispatched everywhere; the view scopes only while their view
 * is active and no modal is open, and the `modal` scope only while a modal is open.
 */
const DEFAULT_KEYMAPS = {
  global: {
    view_dashboard: "1",
    view_timeline: "2",
    view_reflections: "3",
    view_projects: "4",
    next_view: "tab",
    search_filter: "/",
    help: "?",
    refresh: "r",
    cancel: "escape",
    quit: "q",
  },
  timeline: {
    down: ["j", "down"],
    up: ["k", "up"],
    move_top: "g",
    move_bottom: "G",
    jump_today: "T",
    prev_day: "[",
    next_day: "]",
    undo: ["u", "U"],
    quick_capture: ["n", "c"],
    edit_entry: "e",
    edit_project: "p",
    edit_tags: "t",
    delete_entry: "d",
    open_editor: "o",
  },
  projects: {
    down: ["j", "down"],
    up: ["k", "up"],
    new_project: ["n", "N"],
    edit_project_settings: "P",
    edit_project_content: ["e", "o"],
  },
  dashboard: {
    day_prev: ["h", "left"],
    day_next: ["l", "right"],
    toggle_routine: ["space", " "],
    open_day: "return",
    quick_capture: ["n", "c"],
  },
  reflections: {
    down: ["j", "down"],
    up: ["k", "up"],
    cadence_week: ["w", "W"],
    cadence_month: ["m", "M"],
    cadence_quarter: "Q",
    cadence_year: ["y", "Y"],
    open_reflection: ["e", "return"],
  },
  modal: {
    submit: ["return", "kpenter"],
    cancel: "escape",
    suggestion_next: "down",
    suggestion_prev: "up",
    suggestion_accept: "tab",
    draft_in_editor: "e",
  },
} satisfies Record<string, Record<string, Binding>>;

function scopeSchema<T extends Record<string, Binding>>(defaults: T) {
  const shape = Object.fromEntries(
    Object.entries(defaults).map(([action, value]) => [action, binding(value)]),
  ) as { [K in keyof T]: z.ZodDefault<typeof BindingSchema> };

  return z.object(shape).default(defaults);
}

export const KeymapsSchema = z.object({
  global: scopeSchema(DEFAULT_KEYMAPS.global),
  timeline: scopeSchema(DEFAULT_KEYMAPS.timeline),
  projects: scopeSchema(DEFAULT_KEYMAPS.projects),
  dashboard: scopeSchema(DEFAULT_KEYMAPS.dashboard),
  reflections: scopeSchema(DEFAULT_KEYMAPS.reflections),
  modal: scopeSchema(DEFAULT_KEYMAPS.modal),
});

export type Keymaps = z.infer<typeof KeymapsSchema>;

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
  keymaps: KeymapsSchema.default({}),
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

// @unit journals.core.db-path
// @summary Resolve the SQLite path
export function resolveDbPath(rawPath: string, baseDir?: string): string {
  if (rawPath.startsWith("~/") || rawPath === "~") {
    return path.join(os.homedir(), rawPath.slice(rawPath === "~" ? 1 : 2));
  }
  const root = baseDir || loadedConfigDir || process.cwd();
  return path.resolve(root, rawPath);
}

// @unit journals.core.config
// @summary Load the YAML configuration
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
