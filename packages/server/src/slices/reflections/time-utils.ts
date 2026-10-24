export interface PeriodRange {
  periodKey: string;
  label: string;
  startDate: number; // Unix ms timestamp (start of period, inclusive)
  endDate: number; // Unix ms timestamp (end of period, inclusive)
}

function pad(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Get ISO week number and year for a given date
 */
export function getIsoWeek(d: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return { year: target.getUTCFullYear(), week: weekNumber };
}

/**
 * Get start and end timestamp for an ISO week key (e.g. 2026-W42)
 */
export function getWeekRange(year: number, week: number): PeriodRange {
  // Find Thursday of week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNr = (jan4.getUTCDay() + 6) % 7;
  const mondayWeek1 = new Date(Date.UTC(year, 0, 4 - dayNr));

  const startMonday = new Date(mondayWeek1.getTime() + (week - 1) * 7 * 86400000);
  startMonday.setUTCHours(0, 0, 0, 0);

  const endSunday = new Date(startMonday.getTime() + 6 * 86400000);
  endSunday.setUTCHours(23, 59, 59, 999);

  const weekStr = pad(week);
  const periodKey = `${year}-W${weekStr}`;
  const startStr = `${startMonday.getUTCMonth() + 1}/${startMonday.getUTCDate()}`;
  const endStr = `${endSunday.getUTCMonth() + 1}/${endSunday.getUTCDate()}`;

  return {
    periodKey,
    label: `${year} Week ${weekStr} (${startStr} - ${endStr})`,
    startDate: startMonday.getTime(),
    endDate: endSunday.getTime(),
  };
}

/**
 * Get start and end timestamp for a month key (e.g. 2026-10)
 */
export function getMonthRange(year: number, month: number): PeriodRange {
  // month is 1-12
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // End of month is 0th day of next month
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const monthStr = pad(month);

  return {
    periodKey: `${year}-${monthStr}`,
    label: `${monthNames[month - 1]} ${year}`,
    startDate: start.getTime(),
    endDate: end.getTime(),
  };
}

/**
 * Get start and end timestamp for a quarter key (e.g. 2026-Q4)
 */
export function getQuarterRange(year: number, quarter: number): PeriodRange {
  // quarter is 1-4
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));

  return {
    periodKey: `${year}-Q${quarter}`,
    label: `${year} Q${quarter} (${start.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} - ${end.toLocaleString("en-US", { month: "short", timeZone: "UTC" })})`,
    startDate: start.getTime(),
    endDate: end.getTime(),
  };
}

/**
 * Get start and end timestamp for a year key (e.g. 2026)
 */
export function getYearRange(year: number): PeriodRange {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  return {
    periodKey: `${year}`,
    label: `Year ${year}`,
    startDate: start.getTime(),
    endDate: end.getTime(),
  };
}

export function parsePeriodKey(
  type: "WEEK" | "MONTH" | "QUARTER" | "YEAR",
  key: string,
): PeriodRange | null {
  if (type === "WEEK") {
    const match = key.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return null;
    return getWeekRange(Number(match[1]), Number(match[2]));
  }
  if (type === "MONTH") {
    const match = key.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    return getMonthRange(Number(match[1]), Number(match[2]));
  }
  if (type === "QUARTER") {
    const match = key.match(/^(\d{4})-Q([1-4])$/);
    if (!match) return null;
    return getQuarterRange(Number(match[1]), Number(match[2]));
  }
  if (type === "YEAR") {
    const match = key.match(/^(\d{4})$/);
    if (!match) return null;
    return getYearRange(Number(match[1]));
  }
  return null;
}

/**
 * Generate all periods of type between fromTime and toTime (inclusive) in reverse chronological order (newest first).
 * The earliest generated period will have its endDate >= fromTime.
 */
export function generatePeriods(
  type: "WEEK" | "MONTH" | "QUARTER" | "YEAR",
  fromTime: number,
  toTime: number = Date.now(),
): PeriodRange[] {
  const now = new Date(toTime);
  const from = new Date(fromTime);
  const periods: PeriodRange[] = [];

  if (type === "WEEK") {
    // Build calendar weeks backwards from now
    const currentWeekDate = new Date(now.getTime());
    // Move to Thursday of current week to avoid DST issues
    const dayNr = (currentWeekDate.getUTCDay() + 6) % 7;
    currentWeekDate.setUTCDate(currentWeekDate.getUTCDate() - dayNr + 3);

    while (true) {
      const { year, week } = getIsoWeek(currentWeekDate);
      const range = getWeekRange(year, week);
      if (range.endDate < from.getTime() && periods.length > 0) {
        break;
      }
      if (!periods.some((p) => p.periodKey === range.periodKey)) {
        periods.push(range);
      }
      currentWeekDate.setUTCDate(currentWeekDate.getUTCDate() - 7);
      if (periods.length >= 260) break; // max 5 years back
    }
  } else if (type === "MONTH") {
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth() + 1; // 1-12

    while (true) {
      const range = getMonthRange(year, month);
      if (range.endDate < from.getTime() && periods.length > 0) {
        break;
      }
      periods.push(range);
      month--;
      if (month < 1) {
        month = 12;
        year--;
      }
      if (periods.length >= 60) break; // max 5 years back
    }
  } else if (type === "QUARTER") {
    let year = now.getUTCFullYear();
    let quarter = Math.floor(now.getUTCMonth() / 3) + 1;

    while (true) {
      const range = getQuarterRange(year, quarter);
      if (range.endDate < from.getTime() && periods.length > 0) {
        break;
      }
      periods.push(range);
      quarter--;
      if (quarter < 1) {
        quarter = 4;
        year--;
      }
      if (periods.length >= 40) break; // max 10 years back
    }
  } else if (type === "YEAR") {
    let year = now.getUTCFullYear();

    while (true) {
      const range = getYearRange(year);
      if (range.endDate < from.getTime() && periods.length > 0) {
        break;
      }
      periods.push(range);
      year--;
      if (periods.length >= 20) break; // max 20 years back
    }
  }

  return periods;
}
