import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setDbExecutor } from '../database';
import { createTestDb } from '../testExecutor';
import type { DbExecutor } from '../executor';
import { createChild } from '../children';
import { createCarer } from '../carers';
import { createHoliday } from '../holidays';
import {
  addTimeSlot,
  applySession,
  clearDay,
  copyDay,
  deleteAssignment,
  listAssignments,
  listAssignmentsForDate,
  listDayAssignments,
  removeSession,
  repeatAssignments,
  repeatTargets,
  updateAssignment,
} from '../assignments';

let db: DbExecutor & { close: () => void };
let holidayId: number;
let ada: number;
let bo: number;
let gran: number;
let mum: number;

// Mon 19 Oct – Fri 30 Oct 2026: a two-week half term, weekdays only.
const HOLIDAY = {
  name: 'October half term',
  start_date: '2026-10-19',
  end_date: '2026-10-30',
  exclude_weekends: 1,
};

beforeEach(async () => {
  db = await createTestDb();
  setDbExecutor(db);
  holidayId = await createHoliday(HOLIDAY);
  ada = await createChild({ name: 'Ada', colour: '#378ADD' });
  bo = await createChild({ name: 'Bo', colour: '#E2725B' });
  gran = await createCarer({ name: 'Grandma', short_name: 'Gran', type: 'family' });
  mum = await createCarer({ name: 'Mum', short_name: 'Mum', type: 'parent' });
});
afterEach(() => {
  setDbExecutor(null);
  db.close();
});

/** Book a carer for a child, e.g. session(ada, gran, '2026-10-20', '08:00', '12:00'). */
function session(child: number, carer: number, date: string, start: string, end: string, holiday = holidayId) {
  return addTimeSlot({ holiday_id: holiday, child_id: child, carer_id: carer, date, start_time: start, end_time: end });
}

/** "Gran 08:00–12:00" for each of a child's sessions that day, in time order. */
async function dayOf(child: number, date: string, holiday = holidayId) {
  const names = new Map([[gran, 'Gran'], [mum, 'Mum']]);
  return (await listDayAssignments(holiday, child, date)).map(
    (slot) => `${names.get(slot.carer_id)} ${slot.start_time}–${slot.end_time}`,
  );
}

describe('sessions', () => {
  it('stacks several slots in one day', async () => {
    await addTimeSlot({ holiday_id: holidayId, child_id: ada, carer_id: gran, date: '2026-10-20', start_time: '09:00', end_time: '12:00' });
    await addTimeSlot({ holiday_id: holidayId, child_id: ada, carer_id: mum, date: '2026-10-20', start_time: '12:00', end_time: '17:00' });

    const slots = await listDayAssignments(holidayId, ada, '2026-10-20');
    expect(slots).toHaveLength(2);
    expect(slots.every((s) => s.period === null)).toBe(true);
  });

  it('carries notes and cost', async () => {
    await addTimeSlot({
      holiday_id: holidayId, child_id: ada, carer_id: gran, date: '2026-10-20',
      start_time: '08:00', end_time: '12:00', notes: 'pack swimming kit', cost: 12.5,
    });
    const slot = (await listDayAssignments(holidayId, ada, '2026-10-20'))[0];
    expect(slot.notes).toBe('pack swimming kit');
    expect(slot.cost).toBe(12.5);
  });

  it('edits a slot', async () => {
    const id = await addTimeSlot({ holiday_id: holidayId, child_id: ada, carer_id: gran, date: '2026-10-20', start_time: '09:00', end_time: '12:00' });
    await updateAssignment(id, { end_time: '13:00', carer_id: mum });
    const slot = (await listDayAssignments(holidayId, ada, '2026-10-20'))[0];
    expect(slot.end_time).toBe('13:00');
    expect(slot.carer_id).toBe(mum);
  });

  it('deletes a slot', async () => {
    const id = await addTimeSlot({ holiday_id: holidayId, child_id: ada, carer_id: gran, date: '2026-10-20', start_time: '09:00', end_time: '12:00' });
    await deleteAssignment(id);
    expect(await listDayAssignments(holidayId, ada, '2026-10-20')).toHaveLength(0);
  });
});

describe('repeat', () => {
  // Tue 20 Oct, both children covered morning and afternoon.
  async function planTuesday() {
    for (const child of [ada, bo]) {
      await session(child, gran, '2026-10-20', '08:00', '12:00');
      await session(child, mum, '2026-10-20', '12:00', '18:00');
    }
  }

  it('"every day" fills the rest of the holiday', async () => {
    await planTuesday();
    const targets = await repeatAssignments(holidayId, '2026-10-20', 'daily');

    // 10 weekdays in the holiday, minus the source day.
    expect(targets).toHaveLength(9);
    expect(targets).not.toContain('2026-10-20');
    // Weekends are excluded for this holiday, so they are never written to.
    expect(targets).not.toContain('2026-10-24');
    // 10 days x 2 children x 2 slots.
    expect(await listAssignments(holidayId)).toHaveLength(40);
  });

  it('"every Tuesday" fills only the matching weekday', async () => {
    await planTuesday();
    const targets = await repeatAssignments(holidayId, '2026-10-20', 'weekly');
    expect(targets).toEqual(['2026-10-27']);
  });

  it('"pick days" fills only the chosen weekdays', async () => {
    await planTuesday();
    // Mondays and Wednesdays.
    const targets = await repeatAssignments(holidayId, '2026-10-20', 'custom', [1, 3]);
    expect(targets).toEqual(['2026-10-19', '2026-10-21', '2026-10-26', '2026-10-28']);
  });

  it('"pick days" with no days chosen changes nothing', async () => {
    await planTuesday();
    expect(await repeatAssignments(holidayId, '2026-10-20', 'custom', [])).toEqual([]);
  });

  it('"Mon–Fri" skips weekends even when the holiday includes them', async () => {
    const weekendHoliday = await createHoliday({ ...HOLIDAY, name: 'Summer', exclude_weekends: 0 });
    await session(ada, gran, '2026-10-20', '08:00', '12:00', weekendHoliday);

    const targets = await repeatAssignments(weekendHoliday, '2026-10-20', 'weekdays');
    expect(targets).not.toContain('2026-10-24');
    expect(targets).not.toContain('2026-10-25');
    expect(targets).toContain('2026-10-26');
  });

  it('replaces the target day rather than merging into it', async () => {
    await planTuesday();
    // Wednesday already has a different plan for Ada.
    await session(ada, mum, '2026-10-21', '08:00', '10:00');

    await repeatAssignments(holidayId, '2026-10-20', 'daily');

    // Wednesday now matches Tuesday exactly.
    expect(await dayOf(ada, '2026-10-21')).toEqual(['Gran 08:00–12:00', 'Mum 12:00–18:00']);
    expect(await listAssignmentsForDate(holidayId, '2026-10-21')).toHaveLength(4);
  });

  it('copies notes along with the carers', async () => {
    await addTimeSlot({
      holiday_id: holidayId, child_id: ada, carer_id: gran, date: '2026-10-20',
      start_time: '08:00', end_time: '12:00', notes: 'pack swimming kit',
    });
    await repeatAssignments(holidayId, '2026-10-20', 'weekly');
    expect((await listDayAssignments(holidayId, ada, '2026-10-27'))[0].notes).toBe('pack swimming kit');
  });

  it('leaves other holidays untouched', async () => {
    const other = await createHoliday({ ...HOLIDAY, name: 'Christmas' });
    await planTuesday();
    await repeatAssignments(holidayId, '2026-10-20', 'daily');
    expect(await listAssignments(other)).toHaveLength(0);
  });

  it('does nothing for a holiday that does not exist', async () => {
    expect(await repeatAssignments(9999, '2026-10-20', 'daily')).toEqual([]);
  });
});

describe('day helpers', () => {
  it('copies one day onto another', async () => {
    await session(ada, gran, '2026-10-20', '08:00', '12:00');
    await copyDay(holidayId, '2026-10-20', '2026-10-22');
    expect(await dayOf(ada, '2026-10-22')).toEqual(['Gran 08:00–12:00']);
  });

  it('copying a day onto itself is a no-op, not a wipe', async () => {
    await session(ada, gran, '2026-10-20', '08:00', '12:00');
    await copyDay(holidayId, '2026-10-20', '2026-10-20');
    expect(await listDayAssignments(holidayId, ada, '2026-10-20')).toHaveLength(1);
  });

  it('clears one child without touching the other', async () => {
    await session(ada, gran, '2026-10-20', '08:00', '12:00');
    await session(bo, mum, '2026-10-20', '08:00', '12:00');

    await clearDay(holidayId, ada, '2026-10-20');
    expect(await listDayAssignments(holidayId, ada, '2026-10-20')).toHaveLength(0);
    expect(await listDayAssignments(holidayId, bo, '2026-10-20')).toHaveLength(1);
  });
});

describe('repeatTargets', () => {
  // Mon 19 – Sun 25 Oct 2026, weekends included.
  const week = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];

  it('never includes the source day', () => {
    expect(repeatTargets(week, '2026-10-20', 'daily')).not.toContain('2026-10-20');
  });

  it('picks out chosen weekdays, Sunday included', () => {
    expect(repeatTargets(week, '2026-10-20', 'custom', [0, 3])).toEqual(['2026-10-21', '2026-10-25']);
  });
});

describe('applySession', () => {
  it('books one session for several children on several days', async () => {
    const written = await applySession({
      holidayId, childIds: [ada, bo], dates: ['2026-10-20', '2026-10-21'],
      carerId: gran, start: '10:00', end: '15:00',
    });
    expect(written).toBe(4);
    expect(await dayOf(bo, '2026-10-21')).toEqual(['Gran 10:00–15:00']);
  });

  it('replaces whatever overlaps, so a child has one carer at a time', async () => {
    await session(ada, mum, '2026-10-21', '08:00', '12:00');
    await applySession({
      holidayId, childIds: [ada], dates: ['2026-10-21'], carerId: gran, start: '10:00', end: '15:00',
    });
    expect(await dayOf(ada, '2026-10-21')).toEqual(['Gran 10:00–15:00']);
  });

  it('keeps a hand-over: touching end to start is not an overlap', async () => {
    await session(ada, mum, '2026-10-21', '08:00', '10:00');
    await session(ada, mum, '2026-10-21', '15:00', '18:00');
    await applySession({
      holidayId, childIds: [ada], dates: ['2026-10-21'], carerId: gran, start: '10:00', end: '15:00',
    });
    expect(await dayOf(ada, '2026-10-21')).toEqual(['Mum 08:00–10:00', 'Gran 10:00–15:00', 'Mum 15:00–18:00']);
  });

  it('moves an edited session everywhere it was copied, even to times that no longer overlap', async () => {
    for (const date of ['2026-10-20', '2026-10-21']) {
      for (const child of [ada, bo]) await session(child, gran, date, '08:00', '10:00');
    }
    await applySession({
      holidayId, childIds: [ada, bo], dates: ['2026-10-20', '2026-10-21'],
      carerId: mum, start: '15:00', end: '18:00',
      replaces: { carer_id: gran, start_time: '08:00', end_time: '10:00' },
    });
    expect(await dayOf(bo, '2026-10-21')).toEqual(['Mum 15:00–18:00']);
    expect(await listAssignments(holidayId)).toHaveLength(4);
  });

  it('leaves other children and days alone', async () => {
    await session(bo, mum, '2026-10-20', '08:00', '18:00');
    await session(ada, mum, '2026-10-22', '08:00', '18:00');
    await applySession({
      holidayId, childIds: [ada], dates: ['2026-10-20'], carerId: gran, start: '08:00', end: '18:00',
    });
    expect(await dayOf(bo, '2026-10-20')).toEqual(['Mum 08:00–18:00']);
    expect(await dayOf(ada, '2026-10-22')).toEqual(['Mum 08:00–18:00']);
  });
});

describe('removeSession', () => {
  it('removes the same session for the chosen children and days only', async () => {
    for (const date of ['2026-10-20', '2026-10-21']) {
      for (const child of [ada, bo]) {
        await session(child, gran, date, '08:00', '12:00');
        await session(child, mum, date, '12:00', '18:00');
      }
    }
    await removeSession({
      holidayId, childIds: [ada, bo], dates: ['2026-10-20'],
      session: { carer_id: gran, start_time: '08:00', end_time: '12:00' },
    });
    expect(await dayOf(ada, '2026-10-20')).toEqual(['Mum 12:00–18:00']);
    expect(await dayOf(bo, '2026-10-21')).toEqual(['Gran 08:00–12:00', 'Mum 12:00–18:00']);
  });
});
