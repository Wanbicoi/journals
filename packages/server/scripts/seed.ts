import { loadConfig, resolveDbPath } from "@journals/core";
import { initDb } from "../src/db/client.js";
import { entries, entryTags, projects, tags } from "../src/db/schema.js";

// Projects including recurring routines with different policies
const PROJECT_DEFINITIONS = [
  {
    name: "Fitness",
    content: "# Fitness Routine\nDaily morning workout, stretching, and cardio.",
    recurrence: "FREQ=DAILY",
    missedPolicy: "accumulate", // Accumulates debt if missed
  },
  {
    name: "Deep-Work",
    content: "# Deep Work & Engineering\nFocused uninterrupted coding sessions.",
    recurrence: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", // Weekdays
    missedPolicy: "accumulate",
  },
  {
    name: "Reading",
    content: "# Book & Paper Reading\nRead chapters or engineering whitepapers every 2 days.",
    recurrence: "INTERVAL=2;FREQ=DAILY",
    missedPolicy: "spike", // Spike only on that date, no accumulated debt
  },
  {
    name: "Meditation",
    content: "# Mindfulness & Reflection\nDaily evening meditation.",
    recurrence: "FREQ=DAILY",
    missedPolicy: "mark_done", // Auto-cleared/forgiven
  },
  {
    name: "Side-Project",
    content: "# Side Project\nHacking on weekend side projects.",
    recurrence: "FREQ=WEEKLY;BYDAY=SA,SU",
    missedPolicy: "spike",
  },
  {
    name: "Inbox",
    content: "# Inbox\nQuick captures and unorganized ideas.",
    recurrence: null,
    missedPolicy: "spike",
  },
  {
    name: "Infrastructure",
    content: "# Infrastructure\nCI/CD pipelines, containerization, and hosting.",
    recurrence: null,
    missedPolicy: "spike",
  },
  {
    name: "Website",
    content: "# Website\nLanding page, documentation, and user guides.",
    recurrence: null,
    missedPolicy: "spike",
  },
];

const ROUTINE_ENTRIES: Record<string, string[]> = {
  Fitness: [
    "Completed 45m strength training + 15m stretch",
    "5km morning jog around the park",
    "HIIT workout: kettlebell swings, pull-ups, pushups",
    "Restorative yoga session and core workout",
  ],
  "Deep-Work": [
    "Refactored terminal bar chart rendering engine",
    "Optimized SQLite FTS5 queries and indexing",
    "Built bidirectional routine monitor telemetry panel",
    "Implemented keyboard navigation and date drilldown in TUI",
  ],
  Reading: [
    "Read chapters 3-4 of Designing Data-Intensive Applications",
    "Read RFC on iCalendar RFC 5545 recurrence specification",
    "Studied distributed systems consensus papers (Raft)",
  ],
  Meditation: ["15m mindfulness breathing session before sleep", "Morning 10m guided meditation"],
  "Side-Project": [
    "Built prototype MCP tool integration",
    "Configured Nix flake devshell for rust bindings",
  ],
};

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
  const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0);

  const projectMap = new Map<string, { id: string; name: string }>();

  // 1. Seed Projects (anchored 60 days ago)
  const sixtyDaysAgo = baseTime.getTime() - 60 * 86400 * 1000;
  for (const def of PROJECT_DEFINITIONS) {
    const id = crypto.randomUUID();
    db.insert(projects)
      .values({
        id,
        name: def.name,
        content: def.content,
        recurrence: def.recurrence,
        missedPolicy: def.missedPolicy,
        createdAt: sixtyDaysAgo,
        updatedAt: sixtyDaysAgo,
      })
      .run();
    projectMap.set(def.name, { id, name: def.name });
  }
  console.log(`Seeded ${projectMap.size} projects.`);

  // 2. Schedule intentional Break Days:
  // - Global vacation 25-28 days ago (4 days)
  // - Sick leave 10-12 days ago (3 days)
  // - Single-project break for Fitness 40-42 days ago (3 days, sprained ankle)
  const breakEvents = [
    {
      dayOffset: 28,
      breakDays: 4,
      projectName: null, // Global break
      content: "Annual beach vacation with family /break 4d",
      tags: ["vacation", "holiday"],
    },
    {
      dayOffset: 12,
      breakDays: 3,
      projectName: null, // Global break
      content: "Fever and flu, staying in bed to rest /break 3d",
      tags: ["sick", "health"],
    },
    {
      dayOffset: 42,
      breakDays: 3,
      projectName: "Fitness",
      content: "Sprained ankle during sprint, pausing workouts @Fitness /break 3d",
      tags: ["injury", "recovery"],
    },
  ];

  for (const b of breakEvents) {
    const bTime = baseTime.getTime() - b.dayOffset * 86400 * 1000;
    const entryId = crypto.randomUUID();
    const projId = b.projectName ? (projectMap.get(b.projectName)?.id ?? null) : null;

    db.insert(entries)
      .values({
        id: entryId,
        projectId: projId,
        content: b.content,
        breakDays: b.breakDays,
        createdAt: bTime,
        updatedAt: bTime,
      })
      .run();

    for (const t of b.tags) {
      db.insert(tags).values({ name: t }).onConflictDoNothing().run();
      db.insert(entryTags).values({ entryId, tagName: t }).onConflictDoNothing().run();
    }
  }

  // 3. Generate journal entries over the last 60 days
  // We intentionally skip some days for "Fitness" and "Reading" to generate realistic
  // monitor spikes (days lazy/undisciplined) and accumulated debts.
  let entryCount = breakEvents.length;

  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(baseTime.getTime() - dayOffset * 86400 * 1000);
    const dayOfWeek = dayDate.getDay(); // 0 = Sun, 6 = Sat

    // Check if within global break periods
    const inVacation = dayOffset <= 28 && dayOffset >= 25;
    const inFlu = dayOffset <= 12 && dayOffset >= 10;
    if (inVacation || inFlu) {
      // No routines logged during sick/vacation
      continue;
    }

    // Check if in Fitness break
    const inFitnessBreak = dayOffset <= 42 && dayOffset >= 40;

    // Simulate routine discipline:
    // Fitness (Daily): Completed 75% of days, but skipped days: 5, 6, 17, 18, 33, 48 (spikes!)
    const fitnessSkipped = [5, 6, 17, 18, 33, 48].includes(dayOffset);
    if (!inFitnessBreak && !fitnessSkipped) {
      const fitnessProj = projectMap.get("Fitness");
      if (fitnessProj) {
        const entryId = crypto.randomUUID();
        const text = ROUTINE_ENTRIES.Fitness[dayOffset % ROUTINE_ENTRIES.Fitness.length];
        const entryTime = new Date(dayDate);
        entryTime.setHours(7, 30, 0, 0);

        db.insert(entries)
          .values({
            id: entryId,
            projectId: fitnessProj.id,
            content: text,
            breakDays: 0,
            createdAt: entryTime.getTime(),
            updatedAt: entryTime.getTime(),
          })
          .run();
        entryCount++;
      }
    }

    // Deep-Work (Weekdays: Mon-Fri)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const deepWorkSkipped = [3, 14, 31].includes(dayOffset);
    if (isWeekday && !deepWorkSkipped) {
      const dwProj = projectMap.get("Deep-Work");
      if (dwProj) {
        const entryId = crypto.randomUUID();
        const text = ROUTINE_ENTRIES["Deep-Work"][dayOffset % ROUTINE_ENTRIES["Deep-Work"].length];
        const entryTime = new Date(dayDate);
        entryTime.setHours(11, 0, 0, 0);

        db.insert(entries)
          .values({
            id: entryId,
            projectId: dwProj.id,
            content: text,
            breakDays: 0,
            createdAt: entryTime.getTime(),
            updatedAt: entryTime.getTime(),
          })
          .run();
        entryCount++;
      }
    }

    // Reading (Every 2 days): Skipped on days 2, 8, 20
    const isReadingDay = dayOffset % 2 === 0;
    const readingSkipped = [2, 8, 20].includes(dayOffset);
    if (isReadingDay && !readingSkipped) {
      const readingProj = projectMap.get("Reading");
      if (readingProj) {
        const entryId = crypto.randomUUID();
        const text = ROUTINE_ENTRIES.Reading[dayOffset % ROUTINE_ENTRIES.Reading.length];
        const entryTime = new Date(dayDate);
        entryTime.setHours(21, 15, 0, 0);

        db.insert(entries)
          .values({
            id: entryId,
            projectId: readingProj.id,
            content: text,
            breakDays: 0,
            createdAt: entryTime.getTime(),
            updatedAt: entryTime.getTime(),
          })
          .run();
        entryCount++;
      }
    }

    // Occasional Inbox ideas / notes (every 3 days)
    if (dayOffset % 3 === 0) {
      const inboxProj = projectMap.get("Inbox");
      if (inboxProj) {
        const entryId = crypto.randomUUID();
        const entryTime = new Date(dayDate);
        entryTime.setHours(16, 45, 0, 0);

        db.insert(entries)
          .values({
            id: entryId,
            projectId: inboxProj.id,
            content: "Thought on local caching and terminal rendering throughput",
            breakDays: 0,
            createdAt: entryTime.getTime(),
            updatedAt: entryTime.getTime(),
          })
          .run();
        entryCount++;
      }
    }
  }

  console.log(`Seeded ${entryCount} total entries across last 60 days.`);
  console.log("Seeding completed successfully!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
