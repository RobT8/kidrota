import { dayOfWeek, getHolidayDates } from '../utils/dates';
import { getDb } from './database';
import { getHoliday } from './holidays';
import { buildSetClause } from './sql';
import type { Assignment } from './types';

/** Every assignment in a holiday. */
export async function listAssignments(holidayId: number): Promise<Assignment[]> {
  const db = await getDb();
  return db.query<Assignment>(
    'SELECT * FROM assignments WHERE holiday_id = ? ORDER BY date, child_id, period, start_time',
    [holidayId],
  );
}

/** Assignments for one child on one day. */
export async function listDayAssignments(
  holidayId: number,
  childId: number,
  date: string,
): Promise<Assignment[]> {
  const db = await getDb();
  return db.query<Assignment>(
    `SELECT * FROM assignments
     WHERE holiday_id = ? AND child_id = ? AND date = ?
     ORDER BY period, start_time`,
    [holidayId, childId, date],
  );
}

/** Assignments for every child on one day — the day assignment screen. */
export async function listAssignmentsForDate(
  holidayId: number,
  date: string,
): Promise<Assignment[]> {
  const db = await getDb();
  return db.query<Assignment>(
    `SELECT * FROM assignments
     WHERE holiday_id = ? AND date = ?
     ORDER BY child_id, period, start_time`,
    [holidayId, date],
  );
}

/** Add a session: a carer looking after a child from start to end time. */
export async function addTimeSlot(input: {
  holiday_id: number;
  child_id: number;
  carer_id: number;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string | null;
  cost?: number | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO assignments
       (holiday_id, child_id, carer_id, date, period, start_time, end_time, notes, cost)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    [
      input.holiday_id,
      input.child_id,
      input.carer_id,
      input.date,
      input.start_time,
      input.end_time,
      input.notes ?? null,
      input.cost ?? null,
    ],
  );
  return result.lastId;
}

export async function updateAssignment(
  id: number,
  changes: Partial<Pick<Assignment, 'carer_id' | 'start_time' | 'end_time' | 'notes' | 'cost'>>,
): Promise<void> {
  const update = buildSetClause(changes, [
    'carer_id', 'start_time', 'end_time', 'notes', 'cost',
  ]);
  if (!update) return;

  const db = await getDb();
  await db.run(`UPDATE assignments SET ${update.clause} WHERE id = ?`, [...update.values, id]);
}

export async function deleteAssignment(id: number): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM assignments WHERE id = ?', [id]);
}

export type RepeatRule = 'daily' | 'weekdays' | 'weekly' | 'custom';

/**
 * Copy one day's plan onto other days in the same holiday — the biggest
 * time-saver in the app.
 *
 * Repeats are materialised as real rows rather than stored as a rule, so a
 * later edit to one day never silently rewrites the others.
 *
 * @param customDays Day numbers for the 'custom' rule. 0 = Sunday … 6 = Saturday.
 * @returns The dates that were written to.
 */
export async function repeatAssignments(
  holidayId: number,
  sourceDate: string,
  rule: RepeatRule,
  customDays?: number[],
): Promise<string[]> {
  const holiday = await getHoliday(holidayId);
  if (!holiday) return [];

  const targets = repeatTargets(getHolidayDates(holiday), sourceDate, rule, customDays);
  for (const date of targets) await copyDay(holidayId, sourceDate, date);
  return targets;
}

/**
 * The other days of a holiday a rule picks out, never the source day itself.
 *
 * @param dates The holiday's dates, as getHolidayDates gives them.
 * @param customDays Day numbers for the 'custom' rule. 0 = Sunday … 6 = Saturday.
 */
export function repeatTargets(
  dates: string[],
  sourceDate: string,
  rule: RepeatRule,
  customDays?: number[],
): string[] {
  const sourceDayOfWeek = dayOfWeek(sourceDate);
  return dates.filter((date) => {
    if (date === sourceDate) return false;
    const dow = dayOfWeek(date);
    switch (rule) {
      case 'daily':
        return true;
      case 'weekdays':
        return dow >= 1 && dow <= 5;
      case 'weekly':
        return dow === sourceDayOfWeek;
      case 'custom':
        return customDays?.includes(dow) ?? false;
    }
  });
}

/** A session as it was before an edit, so the same one can be found elsewhere. */
export interface SessionShape {
  carer_id: number;
  start_time: string;
  end_time: string;
}

/**
 * Save one session for several children across several days, in one go —
 * "Gran 10:00–15:00 for Ada and Bo, every weekday".
 *
 * A child has one carer at a time, so on each day anything of that child's
 * that overlaps the new times is replaced. When editing, `replaces` is the
 * session as it was: the same session on the other days and children (same
 * carer, same times) is replaced too, even where the new times no longer
 * overlap it, so moving Gran from 10–15 to 13–18 moves her everywhere.
 *
 * Touching end to start is a hand-over, not an overlap: Dad until 10:00 and
 * Gran from 10:00 both stay.
 *
 * @returns How many sessions were written.
 */
export async function applySession(input: {
  holidayId: number;
  childIds: number[];
  dates: string[];
  carerId: number;
  start: string;
  end: string;
  replaces?: SessionShape | null;
}): Promise<number> {
  const { holidayId, childIds, dates, carerId, start, end, replaces } = input;
  const db = await getDb();
  return db.transaction(async () => {
    let written = 0;
    for (const date of new Set(dates)) {
      for (const childId of new Set(childIds)) {
        await db.run(
          `DELETE FROM assignments
           WHERE holiday_id = ? AND child_id = ? AND date = ?
             AND (
               (start_time < ? AND ? < end_time)
               OR (carer_id = ? AND start_time = ? AND end_time = ?)
             )`,
          [
            holidayId,
            childId,
            date,
            end,
            start,
            replaces?.carer_id ?? -1,
            replaces?.start_time ?? '',
            replaces?.end_time ?? '',
          ],
        );
        await addTimeSlot({
          holiday_id: holidayId,
          child_id: childId,
          carer_id: carerId,
          date,
          start_time: start,
          end_time: end,
        });
        written++;
      }
    }
    return written;
  });
}

/**
 * Remove a session, and — when asked — the same session (same carer and
 * times) for other children and on other days.
 */
export async function removeSession(input: {
  holidayId: number;
  childIds: number[];
  dates: string[];
  session: SessionShape;
}): Promise<void> {
  const { holidayId, childIds, dates, session } = input;
  const db = await getDb();
  await db.transaction(async () => {
    for (const date of new Set(dates)) {
      for (const childId of new Set(childIds)) {
        await db.run(
          `DELETE FROM assignments
           WHERE holiday_id = ? AND child_id = ? AND date = ?
             AND carer_id = ? AND start_time = ? AND end_time = ?`,
          [holidayId, childId, date, session.carer_id, session.start_time, session.end_time],
        );
      }
    }
  });
}

/**
 * Replace a day's plan with a copy of another day's, for every child.
 * Replacing rather than merging keeps the result predictable: after a repeat,
 * the target day matches the source day exactly.
 */
export async function copyDay(
  holidayId: number,
  sourceDate: string,
  targetDate: string,
): Promise<void> {
  if (sourceDate === targetDate) return;
  const db = await getDb();

  await db.run('DELETE FROM assignments WHERE holiday_id = ? AND date = ?', [
    holidayId,
    targetDate,
  ]);
  await db.run(
    `INSERT INTO assignments
       (holiday_id, child_id, carer_id, date, period, start_time, end_time, notes, cost)
     SELECT holiday_id, child_id, carer_id, ?, period, start_time, end_time, notes, cost
     FROM assignments
     WHERE holiday_id = ? AND date = ?`,
    [targetDate, holidayId, sourceDate],
  );
}

/** Remove every assignment for a child on a day. */
export async function clearDay(
  holidayId: number,
  childId: number,
  date: string,
): Promise<void> {
  const db = await getDb();
  await db.run(
    'DELETE FROM assignments WHERE holiday_id = ? AND child_id = ? AND date = ?',
    [holidayId, childId, date],
  );
}
