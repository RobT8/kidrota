import { getHolidayDates } from '../utils/dates';
import { coversWholeDay } from '../utils/timeSlots';
import { getDb } from './database';
import { listChildren } from './children';
import { getHoliday, listHolidays } from './holidays';
import type { Holiday } from './types';

/** Slots a child needs filled per day in simple mode: morning and afternoon. */
const SIMPLE_SLOTS_PER_DAY = 2;

export interface DayCoverage {
  date: string;
  /** Slots needed across all children on this day. */
  totalSlots: number;
  filledSlots: number;
  /** True only when every child is covered for the whole day. */
  covered: boolean;
  /** Anything booked at all, even a partial day. */
  booked: boolean;
}

export interface HolidayCoverage {
  holidayId: number;
  days: DayCoverage[];
  coveredDays: number;
  gapDays: number;
  /** True when nothing has been planned at all — the "Not started yet" state. */
  empty: boolean;
}

/**
 * Work out which days of a holiday are covered and which are gaps.
 *
 * A day is covered only if every child is covered for the whole day: in simple
 * mode that means both AM and PM are booked, in detailed mode at least one time
 * slot exists. One child's unbooked afternoon makes the whole day a gap, which
 * is the point — the parent still has a problem to solve that day.
 */
export async function getHolidayCoverage(holidayId: number): Promise<HolidayCoverage | null> {
  const holiday = await getHoliday(holidayId);
  if (!holiday) return null;
  const children = await listChildren();
  return computeCoverage(holiday, children.length, await loadCover(holiday));
}

/** Coverage for every holiday, for the home screen list and stat cards. */
export async function getAllHolidayCoverage(): Promise<HolidayCoverage[]> {
  const holidays = await listHolidays();
  const children = await listChildren();
  const coverage: HolidayCoverage[] = [];
  for (const holiday of holidays) {
    coverage.push(computeCoverage(holiday, children.length, await loadCover(holiday)));
  }
  return coverage;
}

/** Total unfilled slots across every holiday — the "Gaps to fill" stat. */
export async function countAllGaps(): Promise<number> {
  const all = await getAllHolidayCoverage();
  return all.reduce(
    (total, holiday) =>
      total + holiday.days.reduce((sum, day) => sum + (day.totalSlots - day.filledSlots), 0),
    0,
  );
}

interface Cover {
  /** Per date, how many of its needed slots each child has filled. */
  filled: Map<string, number[]>;
  /** Dates with anything booked at all. */
  booked: Set<string>;
}

/**
 * What each child has booked, grouped by date.
 *
 * Simple mode is counted in SQL, one filled slot per booked AM or PM. Detailed
 * mode needs the times: a child counts as covered only when their sessions
 * leave no gap between DAY_START and DAY_END (utils/timeSlots.ts), so the day
 * is one slot, filled or not.
 */
async function loadCover(holiday: Holiday): Promise<Cover> {
  const db = await getDb();
  const filled = new Map<string, number[]>();
  const booked = new Set<string>();
  const add = (date: string, count: number) => {
    const counts = filled.get(date) ?? [];
    counts.push(count);
    filled.set(date, counts);
    booked.add(date);
  };

  if (holiday.mode === 'simple') {
    const rows = await db.query<{ date: string; n: number }>(
      `SELECT date, COUNT(DISTINCT period) AS n
       FROM assignments
       WHERE holiday_id = ? AND period IS NOT NULL
       GROUP BY date, child_id`,
      [holiday.id],
    );
    for (const row of rows) add(row.date, row.n);
    return { filled, booked };
  }

  const rows = await db.query<{
    date: string;
    child_id: number;
    start_time: string | null;
    end_time: string | null;
  }>(
    `SELECT date, child_id, start_time, end_time
     FROM assignments
     WHERE holiday_id = ? AND period IS NULL`,
    [holiday.id],
  );
  const byChildDay = new Map<string, { date: string; slots: typeof rows }>();
  for (const row of rows) {
    const key = `${row.date}:${row.child_id}`;
    const entry = byChildDay.get(key) ?? { date: row.date, slots: [] };
    entry.slots.push(row);
    byChildDay.set(key, entry);
  }
  for (const { date, slots } of byChildDay.values()) add(date, coversWholeDay(slots) ? 1 : 0);
  return { filled, booked };
}

function computeCoverage(
  holiday: Holiday,
  childCount: number,
  { filled, booked }: Cover,
): HolidayCoverage {
  const slotsPerChild = holiday.mode === 'simple' ? SIMPLE_SLOTS_PER_DAY : 1;
  const days: DayCoverage[] = [];

  for (const date of getHolidayDates(holiday)) {
    // Cap each child's count at the slots they actually need.
    const filledSlots = (filled.get(date) ?? []).reduce(
      (sum, count) => sum + Math.min(count, slotsPerChild),
      0,
    );
    const totalSlots = childCount * slotsPerChild;
    days.push({
      date,
      totalSlots,
      filledSlots,
      covered: totalSlots > 0 && filledSlots >= totalSlots,
      booked: booked.has(date),
    });
  }

  const coveredDays = days.filter((day) => day.covered).length;
  return {
    holidayId: holiday.id,
    days,
    coveredDays,
    gapDays: days.length - coveredDays,
    // A detailed day with a gap has no filled slots but is not untouched.
    empty: days.every((day) => !day.booked),
  };
}
