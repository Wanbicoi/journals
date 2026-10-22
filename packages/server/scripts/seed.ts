import { loadConfig, resolveDbPath } from "@journals/core";
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

  const db = initDb(dbPath, config.server.wal_mode);

  // Clear existing data cleanly
  db.delete(entryTags).run();
  db.delete(entries).run();
  db.delete(tags).run();
  db.delete(projects).run();

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

    db.insert(projects)
      .values({
        id,
        name: def.name,
        content: def.content,
        createdAt,
        updatedAt: createdAt,
      })
      .run();
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
      db.insert(entries)
        .values({
          id: entryId,
          projectId: project.id,
          content: template.text,
          isQuickCapture: true,
          createdAt: entryTime.getTime(),
          updatedAt: entryTime.getTime(),
        })
        .run();

      for (const t of template.tags) {
        allTags.add(t);
        db.insert(tags).values({ name: t }).onConflictDoNothing().run();
        db.insert(entryTags).values({ entryId, tagName: t }).onConflictDoNothing().run();
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
