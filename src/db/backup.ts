import { getDb } from './database';
import { CONVERT_PERIODS_TO_TIMES, SCHEMA_VERSION } from './schema';
import type { Assignment, Carer, Child, Holiday } from './types';
import type { DbExecutor } from './executor';
import {
  holidayLength,
  isCarerType,
  isHexColour,
  isHolidayMode,
  isISODate,
  isName,
  isOptionalCost,
  isOptionalText,
  isSlotPeriod,
  isTimeRange,
  isWholeNumber,
  MAX_TEXT_LENGTH,
} from '../utils/validate';

/** Tables wiped and restored together, children last so cascades behave. */
const DATA_TABLES = ['assignments', 'day_notes', 'holidays', 'children', 'carers', 'app_settings'];

export interface DayNoteRow {
  holiday_id: number;
  date: string;
  note: string;
}

export interface BackupFile {
  /** Guards against importing some unrelated JSON file. */
  app: 'kidrota';
  /** The schema the export came from; a newer one cannot be read. */
  schemaVersion: number;
  exportedAt: string;
  children: Child[];
  carers: Carer[];
  holidays: Holiday[];
  assignments: Assignment[];
  dayNotes: DayNoteRow[];
  settings: Record<string, string | null>;
}

/** Serialise everything on the device into one portable object. */
export async function exportData(): Promise<BackupFile> {
  const db = await getDb();
  const [children, carers, holidays, assignments, dayNotes, settings] = await Promise.all([
    db.query<Child>('SELECT * FROM children ORDER BY sort_order, id'),
    db.query<Carer>('SELECT * FROM carers ORDER BY sort_order, id'),
    db.query<Holiday>('SELECT * FROM holidays ORDER BY start_date'),
    db.query<Assignment>('SELECT * FROM assignments ORDER BY id'),
    db.query<DayNoteRow>('SELECT * FROM day_notes ORDER BY holiday_id, date'),
    db.query<{ key: string; value: string | null }>('SELECT * FROM app_settings'),
  ]);

  return {
    app: 'kidrota',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    children,
    carers,
    holidays,
    assignments,
    dayNotes,
    settings: Object.fromEntries(settings.map((row) => [row.key, row.value])),
  };
}

export class BackupError extends Error {}

/**
 * Longest holiday a backup may carry, in days. Deliberately looser than the
 * limit for creating one (MAX_HOLIDAY_DAYS): a restore brings back what was
 * already yours, possibly from before that limit existed. This only stops a
 * damaged file asking the planner to draw centuries.
 */
const MAX_RESTORED_HOLIDAY_DAYS = 400;

/** Where in the file the first problem is, in words a person can act on. */
function damaged(what: string): never {
  throw new BackupError(`That backup is damaged (${what}), so nothing was restored. Your plans are unchanged.`);
}

function checkRows<T>(value: unknown, what: string, check: (row: Record<string, unknown>) => boolean): T[] {
  if (!Array.isArray(value)) throw new BackupError('That backup is incomplete and cannot be read.');
  for (const row of value) {
    if (typeof row !== 'object' || row === null || !check(row as Record<string, unknown>)) damaged(what);
  }
  return value as T[];
}

function uniqueIds(rows: { id: number }[], what: string): Set<number> {
  const ids = new Set(rows.map((row) => row.id));
  if (ids.size !== rows.length) damaged(`two ${what} share an id`);
  return ids;
}

/**
 * Check a parsed file really is a KidRota backup this build can read.
 *
 * Every row is checked here, before the database is touched: a restore
 * replaces everything, so a file that would fail halfway must be turned away
 * at the door. (importData also runs in one transaction, as a second line of
 * defence.)
 */
export function validateBackup(data: unknown): BackupFile {
  if (typeof data !== 'object' || data === null) {
    throw new BackupError('That file is not a KidRota backup.');
  }

  const file = data as Partial<BackupFile>;
  if (file.app !== 'kidrota') {
    throw new BackupError('That file is not a KidRota backup.');
  }
  if (typeof file.schemaVersion !== 'number') {
    throw new BackupError('That backup is missing its version and cannot be read.');
  }
  if (file.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError(
      'That backup came from a newer version of KidRota. Update the app and try again.',
    );
  }

  const children = checkRows<Child>(file.children, 'a child', (row) =>
    isWholeNumber(row.id) && isName(row.name) && isHexColour(row.colour) && isWholeNumber(row.sort_order));
  const carers = checkRows<Carer>(file.carers, 'a carer', (row) =>
    isWholeNumber(row.id) &&
    isName(row.name) &&
    isName(row.short_name) &&
    isCarerType(row.type) &&
    isOptionalCost(row.cost_per_day) &&
    (row.colour === null || row.colour === undefined || isHexColour(row.colour)) &&
    isWholeNumber(row.sort_order));
  const holidays = checkRows<Holiday>(file.holidays, 'a holiday', (row) =>
    isWholeNumber(row.id) &&
    isName(row.name) &&
    isISODate(row.start_date) &&
    isISODate(row.end_date) &&
    row.end_date >= row.start_date &&
    holidayLength(row.start_date, row.end_date) <= MAX_RESTORED_HOLIDAY_DAYS &&
    isHolidayMode(row.mode) &&
    (row.exclude_weekends === 0 || row.exclude_weekends === 1) &&
    isOptionalText(row.created_at, 40) &&
    isOptionalText(row.updated_at, 40));

  const childIds = uniqueIds(children, 'children');
  const carerIds = uniqueIds(carers, 'carers');
  const holidayIds = uniqueIds(holidays, 'holidays');

  const assignments = checkRows<Assignment>(file.assignments, 'a day of cover', (row) =>
    isWholeNumber(row.id) &&
    holidayIds.has(row.holiday_id as number) &&
    childIds.has(row.child_id as number) &&
    carerIds.has(row.carer_id as number) &&
    isISODate(row.date) &&
    // Either a morning/afternoon slot, or a timed session — never both.
    (isSlotPeriod(row.period)
      ? (row.start_time ?? null) === null && (row.end_time ?? null) === null
      : (row.period ?? null) === null && isTimeRange(row.start_time, row.end_time)) &&
    isOptionalText(row.notes) &&
    isOptionalCost(row.cost));
  uniqueIds(assignments, 'days of cover');

  // Added in a later schema version, so an older backup may not carry them.
  const dayNotes = checkRows<DayNoteRow>(file.dayNotes ?? [], 'a day note', (row) =>
    holidayIds.has(row.holiday_id as number) && isISODate(row.date) && typeof row.note === 'string' && row.note.length <= MAX_TEXT_LENGTH);

  const settings = file.settings ?? {};
  if (
    typeof settings !== 'object' ||
    Array.isArray(settings) ||
    !Object.values(settings).every((value) => value === null || typeof value === 'string')
  ) {
    damaged('its settings');
  }

  return {
    app: 'kidrota',
    schemaVersion: file.schemaVersion,
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
    children,
    carers,
    holidays,
    assignments,
    dayNotes,
    settings,
  };
}

/** Remove every row, leaving the schema in place. Callers own the transaction. */
async function deleteAllRows(db: DbExecutor): Promise<void> {
  for (const table of DATA_TABLES) {
    await db.run(`DELETE FROM ${table}`);
  }
  // Let ids start from 1 again, so a restored backup is byte-comparable.
  await db.run("DELETE FROM sqlite_sequence WHERE name IN ('assignments','holidays','children','carers')");
}

/** Remove every row, leaving the schema in place. */
export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  await db.transaction(() => deleteAllRows(db));
  await db.persist();
}

/**
 * Replace everything on the device with the contents of a backup.
 *
 * Validated first, then applied in one transaction: a partially restored
 * plan would be worse than no restore at all, so if any row is refused the
 * device keeps exactly what it had.
 */
export async function importData(data: unknown): Promise<BackupFile> {
  const file = validateBackup(data);
  const db = await getDb();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    await db.transaction(async () => {
      await deleteAllRows(db);

      for (const child of file.children) {
        await db.run('INSERT INTO children (id, name, colour, sort_order) VALUES (?, ?, ?, ?)', [
          child.id,
          child.name,
          child.colour,
          child.sort_order,
        ]);
      }

      for (const carer of file.carers) {
        await db.run(
          `INSERT INTO carers (id, name, short_name, type, cost_per_day, colour, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            carer.id,
            carer.name,
            carer.short_name,
            carer.type,
            carer.cost_per_day ?? null,
            carer.colour ?? null,
            carer.sort_order,
          ],
        );
      }

      for (const holiday of file.holidays) {
        await db.run(
          `INSERT INTO holidays (id, name, start_date, end_date, mode, exclude_weekends, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            holiday.id,
            holiday.name,
            holiday.start_date,
            holiday.end_date,
            holiday.mode,
            holiday.exclude_weekends,
            holiday.created_at ?? now,
            holiday.updated_at ?? now,
          ],
        );
      }

      for (const assignment of file.assignments) {
        await db.run(
          `INSERT INTO assignments
             (id, holiday_id, child_id, carer_id, date, period, start_time, end_time, notes, cost)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            assignment.id,
            assignment.holiday_id,
            assignment.child_id,
            assignment.carer_id,
            assignment.date,
            assignment.period ?? null,
            assignment.start_time ?? null,
            assignment.end_time ?? null,
            assignment.notes ?? null,
            assignment.cost ?? null,
          ],
        );
      }

      for (const note of file.dayNotes) {
        await db.run('INSERT INTO day_notes (holiday_id, date, note) VALUES (?, ?, ?)', [
          note.holiday_id,
          note.date,
          note.note,
        ]);
      }

      for (const [key, value] of Object.entries(file.settings)) {
        await db.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
      }

      // A backup from before set times became the only way to plan.
      for (const statement of CONVERT_PERIODS_TO_TIMES) await db.run(statement);
    });
  } catch (error) {
    // Rolled back: the device still has exactly what it had before.
    damaged((error as Error).message.includes('UNIQUE') ? 'the same slot is booked twice' : 'it could not be applied');
  }

  await db.persist();
  return file;
}

/** "3 Sep 2026" for the restore confirmation, or null if the file has no date. */
export function backupDate(file: BackupFile): string | null {
  const date = new Date(file.exportedAt);
  if (!file.exportedAt || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
