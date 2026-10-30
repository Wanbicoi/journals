import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  content: text("content").notNull().default(""),
  recurrence: text("recurrence"),
  missedPolicy: text("missed_policy").notNull().default("spike"),
  deletedAt: integer("deleted_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  content: text("content").notNull(),
  breakDays: integer("break_days").notNull().default(0),
  deletedAt: integer("deleted_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const agentEntries = sqliteTable("agent_entries", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  previousAgentEntryId: text("previous_agent_entry_id").references(
    (): AnySQLiteColumn => agentEntries.id,
    { onDelete: "set null" },
  ),
  deletedAt: integer("deleted_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const hitLog = sqliteTable(
  "hit_log",
  {
    id: text("id").primaryKey(),
    agentEntryId: text("agent_entry_id")
      .notNull()
      .references(() => agentEntries.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("hit_log_agent_entry_idx").on(table.agentEntryId, table.createdAt)],
);

export const tags = sqliteTable("tags", {
  name: text("name").primaryKey(),
});

export const entryTags = sqliteTable(
  "entry_tags",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagName: text("tag_name")
      .notNull()
      .references(() => tags.name, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [primaryKey({ columns: [table.entryId, table.tagName] })],
);

export const periodicReflections = sqliteTable("periodic_reflections", {
  id: text("id").primaryKey(),
  periodType: text("period_type").notNull(), // 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
  periodKey: text("period_key").notNull().unique(), // e.g. '2026-W42', '2026-10', '2026-Q4', '2026'
  content: text("content").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
