import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDbExecutor } from '../database';
import { createTestDb } from '../testExecutor';
import type { DbExecutor } from '../executor';
import { BackupError, backupDate, exportData, importData, validateBackup, wipeAllData } from '../backup';
import { SCHEMA_VERSION } from '../schema';
import { createChild, listChildren } from '../children';
import { createCarer, listCarers } from '../carers';
import { createHoliday, listHolidays } from '../holidays';
import { addTimeSlot, listAssignments } from '../assignments';
import { getDayNote, setDayNote } from '../dayNotes';
import { getSetting, setOnboardingComplete, setSetting } from '../settings';

let db: DbExecutor & { close: () => void };

/** A device with a realistic amount of everything on it. */
async function seed() {
  const ada = await createChild({ name: 'Ada', colour: '#378ADD' });
  const bo = await createChild({ name: 'Bo', colour: '#E2725B' });
  const gran = await createCarer({ name: 'Grandma', short_name: 'Gran', type: 'family' });
  const club = await createCarer({
    name: 'Holiday club', short_name: 'Club', type: 'club', cost_per_day: 32.5,
  });

  const simple = await createHoliday({
    name: 'October half term', start_date: '2026-10-19', end_date: '2026-10-23',
    exclude_weekends: 1,
  });
  const detailed = await createHoliday({
    name: 'Summer', start_date: '2027-07-26', end_date: '2027-07-30',
    exclude_weekends: 0,
  });

  // Morning/afternoon cover as the app stored it before set times became the
  // only way to plan — what a backup from 1.0.0 holds.
  await db.run("UPDATE holidays SET mode = 'simple' WHERE id = ?", [simple]);
  await db.run(
    `INSERT INTO assignments (holiday_id, child_id, carer_id, date, period, notes, cost)
     VALUES (?, ?, ?, '2026-10-19', 'am', 'swimming', 12.5), (?, ?, ?, '2026-10-19', 'pm', NULL, NULL)`,
    [simple, ada, gran, simple, bo, club],
  );
  await addTimeSlot({
    holiday_id: detailed, child_id: ada, carer_id: gran, date: '2027-07-26',
    start_time: '09:00', end_time: '12:00',
  });
  await setDayNote(simple, '2026-10-19', 'pack swimming kit');
  await setOnboardingComplete();
  return { simple, detailed, ada, bo, gran, club };
}

beforeEach(async () => {
  db = await createTestDb();
  setDbExecutor(db);
});
afterEach(() => {
  setDbExecutor(null);
  db.close();
});

describe('exportData', () => {
  it('captures every table', async () => {
    await seed();
    const file = await exportData();

    expect(file.app).toBe('kidrota');
    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
    expect(file.children).toHaveLength(2);
    expect(file.carers).toHaveLength(2);
    expect(file.holidays).toHaveLength(2);
    expect(file.assignments).toHaveLength(3);
    expect(file.dayNotes).toHaveLength(1);
    expect(file.settings.onboarding_complete).toBe('true');
  });

  it('exports an empty device without failing', async () => {
    const file = await exportData();
    expect(file.children).toEqual([]);
    expect(file.assignments).toEqual([]);
  });

  it('survives a JSON round trip', async () => {
    await seed();
    const file = await exportData();
    expect(JSON.parse(JSON.stringify(file))).toEqual(file);
  });
});

describe('validateBackup', () => {
  const valid = {
    app: 'kidrota', schemaVersion: 1, exportedAt: '', children: [], carers: [],
    holidays: [], assignments: [], dayNotes: [], settings: {},
  };

  it('accepts a well-formed backup', () => {
    expect(() => validateBackup(valid)).not.toThrow();
  });

  it('rejects an unrelated JSON file', () => {
    expect(() => validateBackup({ hello: 'world' })).toThrow(BackupError);
    expect(() => validateBackup([1, 2, 3])).toThrow(BackupError);
    expect(() => validateBackup(null)).toThrow(BackupError);
    expect(() => validateBackup('a string')).toThrow(BackupError);
  });

  it('rejects a backup from a newer app version', () => {
    expect(() => validateBackup({ ...valid, schemaVersion: SCHEMA_VERSION + 1 })).toThrow(
      /newer version/,
    );
  });

  it('rejects a backup missing a table', () => {
    expect(() => validateBackup({ ...valid, holidays: undefined })).toThrow(/incomplete/);
  });

  it('accepts an older backup without the tables added since', () => {
    // dayNotes arrived in schema v2; a v1 export will not have it.
    const older = { ...valid, dayNotes: undefined, settings: undefined };
    const result = validateBackup(older);
    expect(result.dayNotes).toEqual([]);
    expect(result.settings).toEqual({});
  });
});

describe('wipeAllData', () => {
  it('empties every table but keeps the schema', async () => {
    await seed();
    await wipeAllData();

    expect(await listChildren()).toEqual([]);
    expect(await listCarers()).toEqual([]);
    expect(await listHolidays()).toEqual([]);
    expect(await db.query('SELECT * FROM assignments')).toEqual([]);
    expect(await db.query('SELECT * FROM day_notes')).toEqual([]);
    expect(await getSetting('onboarding_complete')).toBeNull();

    // Still usable straight afterwards.
    await expect(createChild({ name: 'Fresh', colour: '#378ADD' })).resolves.toBeGreaterThan(0);
  });
});

describe('importData', () => {
  it('restores an exported device exactly', async () => {
    const seeded = await seed();
    const file = await exportData();

    await wipeAllData();
    await importData(JSON.parse(JSON.stringify(file)));

    expect((await listChildren()).map((c) => c.name)).toEqual(['Ada', 'Bo']);
    expect((await listCarers()).map((c) => c.name)).toEqual(['Grandma', 'Holiday club']);
    expect((await listHolidays()).map((h) => h.name)).toEqual(['October half term', 'Summer']);
    expect(await listAssignments(seeded.simple)).toHaveLength(2);
    expect(await getDayNote(seeded.simple, '2026-10-19')).toBe('pack swimming kit');
    expect(await getSetting('onboarding_complete')).toBe('true');
  });

  it('keeps ids, so assignments still point at the right child and carer', async () => {
    const seeded = await seed();
    const file = await exportData();
    await importData(JSON.parse(JSON.stringify(file)));

    const assignments = await listAssignments(seeded.simple);
    const morning = assignments.find((a) => a.child_id === seeded.ada)!;
    expect(morning.child_id).toBe(seeded.ada);
    expect(morning.carer_id).toBe(seeded.gran);
    expect(morning.notes).toBe('swimming');
    expect(morning.cost).toBe(12.5);
  });

  it('turns morning/afternoon cover from an older backup into set times', async () => {
    const seeded = await seed();
    const file = await exportData();
    await importData(JSON.parse(JSON.stringify(file)));

    const slots = await listAssignments(seeded.simple);
    expect(slots.map((a) => [a.period, a.start_time, a.end_time])).toEqual([
      [null, '08:00', '12:00'],
      [null, '12:00', '18:00'],
    ]);
    expect((await listHolidays()).every((h) => h.mode === 'detailed')).toBe(true);
  });

  it('preserves time slots', async () => {
    const seeded = await seed();
    const file = await exportData();
    await importData(JSON.parse(JSON.stringify(file)));

    const slots = await listAssignments(seeded.detailed);
    expect(slots).toHaveLength(1);
    expect(slots[0].start_time).toBe('09:00');
    expect(slots[0].end_time).toBe('12:00');
    expect(slots[0].period).toBeNull();
  });

  it('replaces rather than merges', async () => {
    await seed();
    const file = await exportData();

    await createChild({ name: 'Extra', colour: '#5FA85F' });
    expect(await listChildren()).toHaveLength(3);

    await importData(JSON.parse(JSON.stringify(file)));
    expect((await listChildren()).map((c) => c.name)).toEqual(['Ada', 'Bo']);
  });

  it('leaves the device untouched when the file is rejected', async () => {
    await seed();
    await expect(importData({ nonsense: true })).rejects.toThrow(BackupError);

    // Nothing was deleted on the way to failing.
    expect(await listChildren()).toHaveLength(2);
    expect(await listHolidays()).toHaveLength(2);
  });

  it('restores onto an empty device', async () => {
    await seed();
    const file = await exportData();
    const fresh = await createTestDb();
    setDbExecutor(fresh);

    await importData(JSON.parse(JSON.stringify(file)));
    expect(await listChildren()).toHaveLength(2);
    fresh.close();
  });

  it('leaves the database writable afterwards', async () => {
    await seed();
    const file = await exportData();
    await importData(JSON.parse(JSON.stringify(file)));

    // Auto-increment must not collide with the restored ids.
    const id = await createChild({ name: 'Cy', colour: '#5FA85F' });
    expect((await listChildren()).find((c) => c.id === id)?.name).toBe('Cy');
  });

  it('round-trips a setting written after the export', async () => {
    await seed();
    const file = await exportData();
    await setSetting('theme', 'dark');
    await importData(JSON.parse(JSON.stringify(file)));
    // The export predates it, so restoring removes it — replace, not merge.
    expect(await getSetting('theme')).toBeNull();
  });
});

/** A backup being deliberately broken, so any shape goes. */
type Damageable = any;

describe('importData with a damaged file', () => {
  /** A backup of the seeded device, as a plain object a test can damage. */
  async function backupToDamage() {
    await seed();
    return JSON.parse(JSON.stringify(await exportData()));
  }

  async function expectDeviceUnchanged(before: Awaited<ReturnType<typeof exportData>>) {
    const after = await exportData();
    expect({ ...after, exportedAt: '' }).toEqual({ ...before, exportedAt: '' });
  }

  it('keeps everything when one day of cover points at a carer that is not in the file', async () => {
    const file = await backupToDamage();
    const before = await exportData();
    file.assignments.push({ ...file.assignments[0], id: 99, carer_id: 777 });

    await expect(importData(file)).rejects.toThrow(BackupError);
    await expectDeviceUnchanged(before);
  });

  it('keeps everything when a child has no name', async () => {
    const file = await backupToDamage();
    const before = await exportData();
    file.children[0].name = null;

    await expect(importData(file)).rejects.toThrow('nothing was restored');
    await expectDeviceUnchanged(before);
  });

  it('keeps everything when the database itself refuses a row', async () => {
    const file = await backupToDamage();
    const before = await exportData();
    // Passes the row checks, but breaks the one-carer-per-slot unique index.
    file.assignments.push({ ...file.assignments[0], id: 99 });

    await expect(importData(file)).rejects.toThrow('booked twice');
    await expectDeviceUnchanged(before);
    // And the database still works normally afterwards.
    await setSetting('after', 'yes');
    expect(await getSetting('after')).toBe('yes');
  });

  it.each([
    ['an impossible date', (f: Damageable) => { f.holidays[0].start_date = '2026-02-30'; }],
    ['dates the wrong way round', (f: Damageable) => { f.holidays[0].end_date = '2026-01-01'; }],
    ['a centuries-long holiday', (f: Damageable) => { f.holidays[0].start_date = '1900-01-01'; }],
    ['an unknown planning mode', (f: Damageable) => { f.holidays[0].mode = 'weird'; }],
    ['an unknown carer type', (f: Damageable) => { f.carers[0].type = 'hacker'; }],
    ['a colour that is not a colour', (f: Damageable) => { f.children[0].colour = 'url(https://example.invalid/x)'; }],
    ['a slot that is neither AM/PM nor timed', (f: Damageable) => { f.assignments[0].period = 'all_day'; }],
    ['a timed session ending before it starts', (f: Damageable) => { f.assignments[2].start_time = '13:00'; }],
    ['a negative cost', (f: Damageable) => { f.carers[1].cost_per_day = -5; }],
    ['a note on a holiday that is not there', (f: Damageable) => { f.dayNotes[0].holiday_id = 42; }],
    ['a setting that is not text', (f: Damageable) => { f.settings.reminder_days = 7; }],
    ['two children with the same id', (f: Damageable) => { f.children[1].id = f.children[0].id; }],
  ])('rejects %s before touching anything', async (_what, damage) => {
    const file = await backupToDamage();
    const before = await exportData();
    damage(file);

    expect(() => validateBackup(file)).toThrow(BackupError);
    await expect(importData(file)).rejects.toThrow(BackupError);
    await expectDeviceUnchanged(before);
  });
});

describe('backupDate', () => {
  it('formats the export date for the confirmation', () => {
    const file = validateBackup({
      app: 'kidrota', schemaVersion: 1, exportedAt: '2026-09-03T10:00:00.000Z',
      children: [], carers: [], holidays: [], assignments: [],
    });
    // "Sep" or "Sept" depending on the ICU data the runtime ships.
    expect(backupDate(file)).toMatch(/^3 Sept? 2026$/);
  });

  it('is null for a file without a usable date', () => {
    const file = validateBackup({
      app: 'kidrota', schemaVersion: 1, children: [], carers: [], holidays: [], assignments: [],
    });
    expect(backupDate(file)).toBeNull();
  });
});
