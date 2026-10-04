import { getHolidayDates } from '../utils/dates';
import { coversWholeDay } from '../utils/timeSlots';
import { getDb } from './database';
import { listChildren } from './children';
import { getHoliday, listHolidays } from './holidays';
import type { Holiday } from './types';

export interface DayCoverage {
  date: string;
  /** Slots needed on this day: one per child, filled when their whole day is. */
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
 * A day is complete only if every child is covered for the whole day, 08:00
 * to 18:00 with no gap. One child's unbooked afternoon leaves the whole day
 * incomplete, which is the point — the parent still has a problem to solve
 * that day.
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
  /** Per date, the children whose whole day is covered. */
  filled: Map<string, number>;
  /** Dates with anything booked at all. */
  booked: Set<string>;
}

/**
 * What each child has booked, grouped by date. A child counts as covered only
 * when their sessions leave no gap between DAY_START and DAY_END
 * (utils/timeSlots.ts), so each child's day is one slot, filled or not.
 */
async function loadCover(holiday: Holiday): Promise<Cover> {
  const db = await getDb();
  const rows = await db.query<{
    date: string;
    child_id: number;
    start_time: string | null;
    end_time: string | null;
  }>(
    `SELECT date, child_id, start_time, end_time
     FROM assignments
     WHERE holiday_id = ?`,
    [holiday.id],
  );
  const byChildDay = new Map<string, { date: string; slots: typeof rows }>();
  for (const row of rows) {
    const key = `${row.date}:${row.child_id}`;
    const entry = byChildDay.get(key) ?? { date: row.date, slots: [] };
    entry.slots.push(row);
    byChildDay.set(key, entry);
  }

  const filled = new Map<string, number>();
  const booked = new Set<string>();
  for (const { date, slots } of byChildDay.values()) {
    booked.add(date);
    if (coversWholeDay(slots)) filled.set(date, (filled.get(date) ?? 0) + 1);
  }
  return { filled, booked };
}

function computeCoverage(
  holiday: Holiday,
  childCount: number,
  { filled, booked }: Cover,
): HolidayCoverage {
  const days: DayCoverage[] = [];

  for (const date of getHolidayDates(holiday)) {
    // Capped, in case a child deleted since still has bookings that day.
    const filledSlots = Math.min(filled.get(date) ?? 0, childCount);
    days.push({
      date,
      totalSlots: childCount,
      filledSlots,
      covered: childCount > 0 && filledSlots >= childCount,
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
