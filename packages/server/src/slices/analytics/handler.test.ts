import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { type DatabaseInstance, initDb } from "../../db/client.js";
import { entries, projects } from "../../db/schema.js";
import { getDashboardAnalytics } from "./handler.js";

const TEST_DB_PATH = path.join(import.meta.dir, "test-analytics.db");

describe("Analytics & Dashboard Slice", () => {
  let db: DatabaseInstance;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    db = initDb(TEST_DB_PATH, false);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("calculates 60-day metrics, breaks, and project recurrence debts", () => {
    const now = Date.now();
    // 1. Create a project with daily recurrence and 'accumulate' policy
    const projId = "proj-1";
    // Started 5 days ago
    const fiveDaysAgo = now - 5 * 24 * 3600 * 1000;
    db.insert(projects)
      .values({
        id: projId,
        name: "Fitness Routine",
        content: "",
        recurrence: "FREQ=DAILY",
        missedPolicy: "accumulate",
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      })
      .run();

    // 2. Add an entry for today
    db.insert(entries)
      .values({
        id: "entry-1",
        projectId: projId,
        content: "Did pushups",
        breakDays: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 3. Add a break entry starting 2 days ago for 2 days
    const twoDaysAgo = now - 2 * 24 * 3600 * 1000;
    db.insert(entries)
      .values({
        id: "entry-2",
        projectId: null, // global break
        content: "Sick leave /break 2d",
        breakDays: 2,
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
      })
      .run();

    const analytics = getDashboardAnalytics(db, 60);

    expect(analytics.days).toHaveLength(60);
    expect(analytics.totalEntries).toBe(2);
    expect(analytics.totalBreakDays).toBe(2);
    // Since 2 days were frozen by break and 1 day was journaled, some days remain missed
    expect(analytics.activeDebts.length).toBeGreaterThan(0);
    expect(analytics.activeDebts[0].projectName).toBe("Fitness Routine");
  });
});
