import { loadConfig, resolveDbPath } from "@journals/core";
import { v4 as uuidv4 } from "uuid";
import { initDb } from "../src/db/client.js";
import { entries, entryTags, projects, tags } from "../src/db/schema.js";

// 10 projects
const PROJECT_DEFINITIONS = [
  { name: "Inbox", content: "# Inbox\nQuick captures and unorganized ideas." },
  { name: "Journals", content: "# Journals\nCore journal CLI and TUI development." },
  { name: "Website", content: "# Website\nLanding page, documentation, and user guides." },
  {
    name: "Infrastructure",
    content: "# Infrastructure\nCI/CD pipelines, containerization, and hosting.",
  },
  {
    name: "API-Design",
    content: "# API Design\nREST & RPC protocols, schemas, and API versioning.",
  },
  { name: "Mobile", content: "# Mobile App\nReact Native / Expo mobile companion client." },
  { name: "Analytics", content: "# Analytics\nUsage telemetry, crash reporting, and metrics." },
  { name: "Security", content: "# Security\nAudit logging, end-to-end encryption, and auth." },
  {
    name: "Design-System",
    content: "# Design System\nTypography, themes, icons, and terminal components.",
  },
  {
    name: "Research",
    content: "# Research\nExploratory spikes, notes on new libraries and tools.",
  },
];

const NOTE_TEMPLATES = [
  {
    text: "Refactored UI components to use consistent border styling and spacing",
    tags: ["ui", "cleanup"],
  },
  {
    text: "Benchmarked SQLite query performance under concurrent WAL mode",
    tags: ["perf", "sqlite"],
  },
  {
    text: "Investigated memory footprint in long-running terminal sessions",
    tags: ["perf", "debug"],
  },
  { text: "Drafted RFC for local-first sync protocol using CRDTs", tags: ["rfc", "sync"] },
  { text: "Fixed race condition when reassigning note project via shortcut", tags: ["bugfix"] },
  { text: "Updated documentation on keyboard shortcuts and navigation patterns", tags: ["docs"] },
  {
    text: "Reviewed pull request for theme customization and Rosé Pine palette",
    tags: ["review", "theme"],
  },
  {
    text: "Added unit tests for quick capture parser with edge cases",
    tags: ["testing", "parser"],
  },
  {
    text: "Configured GitHub Actions workflow for automated typecheck and linting",
    tags: ["ci", "devops"],
  },
  { text: "Brainstormed roadmap items for next milestone release", tags: ["planning", "roadmap"] },
  { text: "Audited dependencies for vulnerability patches and outdated types", tags: ["security"] },
  {
    text: "Implemented fuzzy search filter for timeline and projects views",
    tags: ["feature", "search"],
  },
  {
    text: "Optimized bundle size and tree-shaking for client distribution",
    tags: ["perf", "build"],
  },
  {
    text: "Conducted user feedback interview on terminal navigation responsiveness",
    tags: ["feedback"],
  },
];

async function seed() {
  const config = loadConfig();
  const dbPath = resolveDbPath(config.server.db_path);
  console.log(`Connecting to database at ${dbPath}...`);

  const { db, sqlite } = initDb(dbPath, config.server.wal_mode);

  // Clear existing data cleanly
  sqlite.run("DELETE FROM entry_tags;");
  sqlite.run("DELETE FROM entries;");
  sqlite.run("DELETE FROM tags;");
  sqlite.run("DELETE FROM projects;");

  console.log("Cleared existing data.");

  const now = new Date();
  // Anchor to today at 14:00
  const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0);

  const createdProjects: { id: string; name: string }[] = [];

  // Seed 10 Projects
  for (let i = 0; i < PROJECT_DEFINITIONS.length; i++) {
    const def = PROJECT_DEFINITIONS[i];
    const id = crypto.randomUUID();
    const createdAt = baseTime.getTime() - (10 - i) * 86400 * 1000;

    sqlite.run(
      "INSERT INTO projects (id, name, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, def.name, def.content, createdAt, createdAt],
    );
    createdProjects.push({ id, name: def.name });
  }
  console.log(`Seeded ${createdProjects.length} projects.`);

  // All distinct tags collected
  const allTags = new Set<string>();

  // Seed 10 Days of Notes (from 9 days ago to today = 10 days)
  let totalEntries = 0;
  for (let dayOffset = 9; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(baseTime.getTime() - dayOffset * 86400 * 1000);

    // 3 to 5 entries per day distributed at different hours
    const entriesTodayCount = 3 + (dayOffset % 3); // 3, 4, or 5 notes
    const hours = [9, 11, 14, 16, 18];

    for (let eIdx = 0; eIdx < entriesTodayCount; eIdx++) {
      const entryTime = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        hours[eIdx % hours.length],
        (eIdx * 17) % 60,
        0,
        0,
      );

      const template = NOTE_TEMPLATES[(dayOffset * 3 + eIdx) % NOTE_TEMPLATES.length];
      // Distribute across projects
      const project = createdProjects[(dayOffset + eIdx) % createdProjects.length];

      const entryId = crypto.randomUUID();
      sqlite.run(
        "INSERT INTO entries (id, project_id, content, is_quick_capture, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [entryId, project.id, template.text, 1, entryTime.getTime(), entryTime.getTime()],
      );

      for (const t of template.tags) {
        allTags.add(t);
        sqlite.run("INSERT OR IGNORE INTO tags (name) VALUES (?)", [t]);
        sqlite.run("INSERT OR IGNORE INTO entry_tags (entry_id, tag_name) VALUES (?, ?)", [
          entryId,
          t,
        ]);
      }

      totalEntries++;
    }
  }

  console.log(`Seeded ${totalEntries} entries across 10 days spanning ${allTags.size} tags.`);
  console.log("Seeding completed successfully!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
