import { describe, expect, test } from "bun:test";
import { initDb } from "../../db/client.js";
import { handleQuickCapture } from "../quick-capture/handler.js";
import { getPeriodDetail, listPeriodStatuses, saveReflection } from "./handler.js";
import {
  getIsoWeek,
  getMonthRange,
  getQuarterRange,
  getWeekRange,
  getYearRange,
} from "./time-utils.js";

describe("Time Utils", () => {
  test("calculates ISO week and ranges accurately", () => {
    // 2026-10-23
    const date = new Date(Date.UTC(2026, 9, 23));
    const iso = getIsoWeek(date);
    expect(iso.year).toBe(2026);
    expect(iso.week).toBe(43);

    const weekRange = getWeekRange(2026, 43);
    expect(weekRange.periodKey).toBe("2026-W43");
    expect(weekRange.label).toContain("2026 Week 43");

    const monthRange = getMonthRange(2026, 10);
    expect(monthRange.periodKey).toBe("2026-10");
    expect(monthRange.label).toBe("Oct 2026");

    const quarterRange = getQuarterRange(2026, 4);
    expect(quarterRange.periodKey).toBe("2026-Q4");

    const yearRange = getYearRange(2026);
    expect(yearRange.periodKey).toBe("2026");
    expect(yearRange.label).toBe("Year 2026");
  });
});

describe("Reflections Slice", () => {
  test("lists period statuses, detects missing reflections, and aggregates entries", () => {
    const db = initDb(":memory:", false, true);

    // Create some entries
    handleQuickCapture(db, "Reflecting on project architecture @core #design");
    handleQuickCapture(db, "Finished weekly goals @core #goals");

    // Check weekly periods
    const weeklyStatuses = listPeriodStatuses(db, "WEEK");
    expect(weeklyStatuses.length).toBeGreaterThan(0);
    const currentWeek = weeklyStatuses[0];
    expect(currentWeek.hasReflection).toBe(false);
    expect(currentWeek.entryCount).toBe(2);

    // Save a reflection for this week
    const saved = saveReflection(
      db,
      "WEEK",
      currentWeek.periodKey,
      "# Weekly Reflection\n\nGreat week of coding.",
    );
    expect(saved.content).toContain("Great week");

    // Check statuses again
    const updatedWeeklyStatuses = listPeriodStatuses(db, "WEEK");
    const updatedCurrentWeek = updatedWeeklyStatuses.find(
      (w) => w.periodKey === currentWeek.periodKey,
    );
    expect(updatedCurrentWeek?.hasReflection).toBe(true);

    // Check detail
    const detail = getPeriodDetail(db, "WEEK", currentWeek.periodKey);
    expect(detail).toBeDefined();
    expect(detail?.reflection?.content).toContain("Great week");
    expect(detail?.entries.length).toBe(2);
    expect(detail?.entries[0].tags.length).toBeGreaterThan(0);
  });

  test("respects configured start_date for period generation", () => {
    const db = initDb(":memory:", false, true);

    // If start_date is 2026-10-01, only October 2026 should be generated for months
    const monthlyStatuses = listPeriodStatuses(db, "MONTH", "2026-10-01");
    expect(monthlyStatuses.length).toBe(1);
    expect(monthlyStatuses[0].periodKey).toBe("2026-10");

    // For year, only 2026
    const yearlyStatuses = listPeriodStatuses(db, "YEAR", "2026-01-01");
    expect(yearlyStatuses.length).toBe(1);
    expect(yearlyStatuses[0].periodKey).toBe("2026");
  });
});
