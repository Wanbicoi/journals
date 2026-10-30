import type {
  PeriodDetail,
  PeriodItemStatus,
  PeriodicReflection,
  ReflectionPeriodType,
  SubReflectionSummary,
} from "@journals/core";
import { loadConfig } from "@journals/core";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, entryTags, periodicReflections, projects } from "../../db/schema.js";
import { generatePeriods, parsePeriodKey } from "./time-utils.js";

/**
 * List periods of a given type with reflection status and entry counts.
 * Flags missing reflections.
 */

// @unit journals.server.list-periods
// @summary List reflection periods and their status
export function listPeriodStatuses(
  db: DatabaseInstance,
  periodType: ReflectionPeriodType,
  startDateConfig?: string,
): PeriodItemStatus[] {
  const config = loadConfig();
  const configuredStartDate = startDateConfig ?? config.reflections?.start_date;
  const now = Date.now();

  let fromTime: number;
  if (configuredStartDate) {
    // Parse configured start date in UTC
    const [y, m, d] = configuredStartDate.split("-").map(Number);
    fromTime = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  } else {
    // Default range: 6 weeks (42 days), 6 months (~180 days), 4 quarters (~365 days), 2 years (~730 days)
    const defaultSpanDays: Record<ReflectionPeriodType, number> = {
      WEEK: 42,
      MONTH: 180,
      QUARTER: 365,
      YEAR: 730,
    };
    fromTime = now - defaultSpanDays[periodType] * 86400000;

    const earliestEntry = db
      .select({ createdAt: entries.createdAt })
      .from(entries)
      .where(isNull(entries.deletedAt))
      .orderBy(asc(entries.createdAt))
      .limit(1)
      .all();

    const earliestReflection = db
      .select({ createdAt: periodicReflections.createdAt })
      .from(periodicReflections)
      .orderBy(asc(periodicReflections.createdAt))
      .limit(1)
      .all();

    if (earliestEntry.length > 0 && earliestEntry[0].createdAt < fromTime) {
      fromTime = earliestEntry[0].createdAt;
    }
    if (earliestReflection.length > 0 && earliestReflection[0].createdAt < fromTime) {
      fromTime = earliestReflection[0].createdAt;
    }
  }

  // Generate calendar periods in reverse chronological order
  const periods = generatePeriods(periodType, fromTime, now);

  // 3. Fetch existing reflections for this period type
  const existingReflections = db
    .select()
    .from(periodicReflections)
    .where(eq(periodicReflections.periodType, periodType))
    .all();

  const reflectionMap = new Map<string, typeof periodicReflections.$inferSelect>();
  for (const r of existingReflections) {
    reflectionMap.set(r.periodKey, r);
  }

  // 4. Precompute entry counts for each period
  return periods.map((period) => {
    const matchingEntries = db
      .select({ id: entries.id })
      .from(entries)
      .leftJoin(projects, eq(entries.projectId, projects.id))
      .where(
        and(
          gte(entries.createdAt, period.startDate),
          lte(entries.createdAt, period.endDate),
          isNull(entries.deletedAt),
          or(isNull(entries.projectId), isNull(projects.deletedAt)),
        ),
      )
      .all();

    const reflection = reflectionMap.get(period.periodKey);

    return {
      periodKey: period.periodKey,
      periodType,
      label: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
      hasReflection: !!reflection && reflection.content.trim().length > 0,
      reflectionId: reflection?.id,
      entryCount: matchingEntries.length,
    };
  });
}

/**
 * Get full detail for a specific period: reflection content + aggregated lower-level entries and sub-reflections
 */

// @unit journals.server.period-detail
// @summary Load one reflection period
export function getPeriodDetail(
  db: DatabaseInstance,
  periodType: ReflectionPeriodType,
  periodKey: string,
): PeriodDetail | null {
  const range = parsePeriodKey(periodType, periodKey);
  if (!range) return null;

  // 1. Fetch current reflection if exists
  const existingReflection = db
    .select()
    .from(periodicReflections)
    .where(
      and(
        eq(periodicReflections.periodType, periodType),
        eq(periodicReflections.periodKey, periodKey),
      ),
    )
    .limit(1)
    .all();

  const reflection: PeriodicReflection | null =
    existingReflection.length > 0
      ? {
          id: existingReflection[0].id,
          periodType: existingReflection[0].periodType as ReflectionPeriodType,
          periodKey: existingReflection[0].periodKey,
          content: existingReflection[0].content,
          createdAt: existingReflection[0].createdAt,
          updatedAt: existingReflection[0].updatedAt,
        }
      : null;

  // 2. Fetch all journal entries falling in this period range
  const rawEntries = db
    .select({
      id: entries.id,
      projectId: entries.projectId,
      projectName: projects.name,
      content: entries.content,
      breakDays: entries.breakDays,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .innerJoin(projects, eq(entries.projectId, projects.id))
    .where(
      and(
        gte(entries.createdAt, range.startDate),
        lte(entries.createdAt, range.endDate),
        isNull(entries.deletedAt),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(desc(entries.createdAt))
    .all();

  const entryIds = rawEntries.map((e) => e.id);
  const tagsByEntryId = new Map<string, string[]>();
  if (entryIds.length > 0) {
    const tagRows = db
      .select({
        entryId: entryTags.entryId,
        tagName: entryTags.tagName,
      })
      .from(entryTags)
      .where(inArray(entryTags.entryId, entryIds))
      .all();

    for (const row of tagRows) {
      const list = tagsByEntryId.get(row.entryId) || [];
      list.push(row.tagName);
      tagsByEntryId.set(row.entryId, list);
    }
  }

  const enrichedEntries = rawEntries.map((e) => ({
    ...e,
    tags: tagsByEntryId.get(e.id) || [],
  }));

  // 3. Fetch sub-level reflections if this is a higher-level view (Month -> Weeks, Quarter -> Months, Year -> Quarters/Months)
  const subReflections: SubReflectionSummary[] = [];

  /**
   * Helper: fetch all reflections of `subType` whose period falls inside `range`.
   * Uses `parsePeriodKey` to compute each sub-period's own date range so that
   * reflections written retroactively (createdAt != period start) are still correctly
   * associated to the parent period.
   */
  const targetRange = range;
  function fetchSubReflections(subType: ReflectionPeriodType): SubReflectionSummary[] {
    const all = db
      .select()
      .from(periodicReflections)
      .where(eq(periodicReflections.periodType, subType))
      .orderBy(desc(periodicReflections.periodKey))
      .all();

    return all
      .filter((r) => {
        const sub = parsePeriodKey(subType, r.periodKey);
        if (!sub) return false;
        // Include if the sub-period overlaps with the parent range
        return sub.startDate < targetRange.endDate && sub.endDate > targetRange.startDate;
      })
      .map((r) => {
        const sub = parsePeriodKey(subType, r.periodKey);
        return {
          periodType: subType,
          periodKey: r.periodKey,
          label: sub?.label || r.periodKey,
          content: r.content,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      });
  }

  if (periodType === "MONTH") {
    subReflections.push(...fetchSubReflections("WEEK"));
  } else if (periodType === "QUARTER") {
    subReflections.push(...fetchSubReflections("MONTH"));
  } else if (periodType === "YEAR") {
    subReflections.push(...fetchSubReflections("QUARTER"));
  }

  return {
    periodKey: range.periodKey,
    periodType,
    label: range.label,
    startDate: range.startDate,
    endDate: range.endDate,
    reflection,
    entries: enrichedEntries,
    subReflections,
  };
}

/**
 * Save or update reflection content for a period
 */

// @unit journals.server.save-reflection
// @summary Save a reflection
export function saveReflection(
  db: DatabaseInstance,
  periodType: ReflectionPeriodType,
  periodKey: string,
  content: string,
): PeriodicReflection {
  const range = parsePeriodKey(periodType, periodKey);
  const now = Date.now();
  // Anchor createdAt timestamp to period's end date or now (whichever is earlier)
  const timestamp = range ? Math.min(now, range.endDate) : now;

  const existing = db
    .select()
    .from(periodicReflections)
    .where(
      and(
        eq(periodicReflections.periodType, periodType),
        eq(periodicReflections.periodKey, periodKey),
      ),
    )
    .limit(1)
    .all();

  if (existing.length > 0) {
    db.update(periodicReflections)
      .set({
        content,
        updatedAt: now,
      })
      .where(eq(periodicReflections.id, existing[0].id))
      .run();

    return {
      id: existing[0].id,
      periodType,
      periodKey,
      content,
      createdAt: existing[0].createdAt,
      updatedAt: now,
    };
  }

  const id = `ref_${crypto.randomUUID().slice(0, 8)}`;
  db.insert(periodicReflections)
    .values({
      id,
      periodType,
      periodKey,
      content,
      createdAt: timestamp,
      updatedAt: now,
    })
    .run();

  return {
    id,
    periodType,
    periodKey,
    content,
    createdAt: timestamp,
    updatedAt: now,
  };
}
