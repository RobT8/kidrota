import type { Assignment, Carer, Child, Holiday } from '../db/types';
import { MAX_HOLIDAY_DAYS, type CarerType, type HolidayMode, type Period } from './constants';
import { addDays, daysBetween } from './dates';
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
} from './validate';

/**
 * A whole holiday plan as a single shareable string.
 *
 * The other parent has their own copy of the app and no server between you, so
 * the plan travels as text they can paste out of a message.
 *
 * Kept compact deliberately: children and carers become indices, and dates
 * become day offsets from the holiday's start, which takes a fortnight's plan
 * for two children from roughly 6KB of plain JSON to under 1KB. That is the
 * difference between a code that pastes into a message and one that does not.
 */
export const SHARE_PREFIX = 'KIDROTA1:';

const CURRENT_VERSION = 1;

/**
 * Drop trailing nulls from a tuple.
 *
 * Most assignments use only the first four fields, so the unused times, notes
 * and cost would otherwise cost `,null,null,null,null` each — about half the
 * whole code on a fully planned fortnight.
 */
function trimTrailingNulls(tuple: unknown[]): unknown[] {
  const out = [...tuple];
  while (out.length > 0 && out[out.length - 1] === null) out.pop();
  return out;
}

/** Tuple layouts, kept as named constants so the format is readable. */
interface CompactPlan {
  v: number;
  /** [name, startDate, endDate, mode, excludeWeekends] */
  h: [string, string, string, HolidayMode, number];
  /** [name, colour][] — position is the child's reference */
  c: [string, string][];
  /** [name, shortName, type, costPerDay | null][] — position is the carer's reference */
  k: [string, string, CarerType, number | null][];
  /** [childIndex, carerIndex, dayOffset, period, startTime, endTime, notes, cost][] */
  a: [number, number, number, Period | null, string | null, string | null, string | null, number | null][];
  /** [dayOffset, note][] */
  n: [number, string][];
}

export interface SharedPlan {
  holiday: Omit<Holiday, 'id' | 'created_at' | 'updated_at'>;
  children: { name: string; colour: string }[];
  carers: { name: string; short_name: string; type: CarerType; cost_per_day: number | null }[];
  assignments: {
    childIndex: number;
    carerIndex: number;
    date: string;
    period: Period | null;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
    cost: number | null;
  }[];
  dayNotes: { date: string; note: string }[];
}

export class ShareCodeError extends Error {}

/** UTF-8 safe base64, since names can contain anything a keyboard produces. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodePlan(input: {
  holiday: Holiday;
  children: Child[];
  carers: Carer[];
  assignments: Assignment[];
  dayNotes: { date: string; note: string }[];
}): string {
  const childIndex = new Map(input.children.map((child, i) => [child.id, i]));
  const carerIndex = new Map(input.carers.map((carer, i) => [carer.id, i]));
  const start = input.holiday.start_date;

  const compact: CompactPlan = {
    v: CURRENT_VERSION,
    h: [
      input.holiday.name,
      input.holiday.start_date,
      input.holiday.end_date,
      input.holiday.mode,
      input.holiday.exclude_weekends,
    ],
    c: input.children.map((child) => [child.name, child.colour]),
    k: input.carers.map((carer) => [
      carer.name,
      carer.short_name,
      carer.type,
      carer.cost_per_day ?? null,
    ]),
    // An assignment naming a child or carer that was not included would decode
    // to a dangling reference, so it is left out rather than shared broken.
    a: input.assignments
      .filter((item) => childIndex.has(item.child_id) && carerIndex.has(item.carer_id))
      .map(
        (item) =>
          trimTrailingNulls([
            childIndex.get(item.child_id)!,
            carerIndex.get(item.carer_id)!,
            daysBetween(start, item.date),
            item.period,
            item.start_time,
            item.end_time,
            item.notes,
            item.cost,
          ]) as CompactPlan['a'][number],
      ),
    n: input.dayNotes.map((note) => [daysBetween(start, note.date), note.note]),
  };

  return SHARE_PREFIX + toBase64(JSON.stringify(compact));
}

/**
 * Pull the code out of whatever was pasted.
 *
 * People copy the whole message from WhatsApp or email, instructions and all,
 * so the code is found wherever it sits rather than the text having to be
 * trimmed down to it by hand. The code is the prefix followed by base64,
 * which has no spaces, so it ends at the first character base64 cannot hold.
 */
/**
 * The message a plan code travels in. The instructions come first and the
 * code last, on its own line, so the recipient knows where to paste it and
 * nothing after the code can run into it.
 */
export function planMessage(holidayName: string, code: string): string {
  return [
    `KidRota plan: ${holidayName}`,
    '',
    'To add it to your KidRota: open Settings → “Add a plan someone sent you”, then paste the text below.',
    '',
    code,
  ].join('\n');
}

export function extractShareCode(text: string): string | null {
  const match = text.match(new RegExp(`${SHARE_PREFIX}[A-Za-z0-9+/=]*`));
  return match ? match[0] : null;
}

/** Longest code accepted; a real one is a few kilobytes. */
const MAX_CODE_LENGTH = 200_000;
/** Generous caps on what one plan can bring, so a damaged code cannot flood the phone. */
const MAX_CHILDREN = 20;
const MAX_CARERS = 50;
const MAX_ASSIGNMENTS = 5_000;
/**
 * How far from the holiday's start a day may sit. A stray assignment left
 * outside the holiday after its dates were changed travels with the plan, so
 * this is wider than the holiday itself — it only rules out nonsense.
 */
const MAX_DAY_OFFSET = 400;

function damaged(): never {
  throw new ShareCodeError('That code is incomplete or damaged. Ask for it again.');
}

function isOffset(value: unknown): value is number {
  return isWholeNumber(value) && Math.abs(value) <= MAX_DAY_OFFSET;
}

/**
 * Turn a pasted code back into a plan, checking every field on the way.
 *
 * A code arrives from someone else's phone through WhatsApp or email, so it is
 * outside input: anything that is not exactly what encodePlan writes is
 * refused here, before a single row is added — rather than being stored and
 * breaking a screen later.
 */
export function decodePlan(code: string): SharedPlan {
  const trimmed = extractShareCode(code);
  if (!trimmed) {
    throw new ShareCodeError('That does not look like a KidRota plan code.');
  }
  if (trimmed.length > MAX_CODE_LENGTH) damaged();

  let compact: CompactPlan;
  try {
    compact = JSON.parse(fromBase64(trimmed.slice(SHARE_PREFIX.length)));
  } catch {
    damaged();
  }

  if (typeof compact !== 'object' || compact === null) damaged();
  if (compact.v !== CURRENT_VERSION) {
    throw new ShareCodeError('That code came from a different version of KidRota.');
  }
  if (!Array.isArray(compact.h) || compact.h.length < 5) damaged();
  for (const key of ['c', 'k', 'a'] as const) {
    if (!Array.isArray(compact[key])) damaged();
  }
  if (compact.n !== undefined && !Array.isArray(compact.n)) damaged();

  const [name, startDate, endDate, mode, excludeWeekends] = compact.h;
  if (
    !isName(name) ||
    !isISODate(startDate) ||
    !isISODate(endDate) ||
    endDate < startDate ||
    !isHolidayMode(mode) ||
    (excludeWeekends !== 0 && excludeWeekends !== 1)
  ) {
    damaged();
  }
  if (holidayLength(startDate, endDate) > MAX_HOLIDAY_DAYS) {
    throw new ShareCodeError(
      `That plan is longer than KidRota can hold (${MAX_HOLIDAY_DAYS / 7} weeks). Ask for it to be split into shorter holidays.`,
    );
  }

  if (compact.c.length > MAX_CHILDREN || compact.k.length > MAX_CARERS || compact.a.length > MAX_ASSIGNMENTS) {
    damaged();
  }

  const children = compact.c.map((entry) => {
    if (!Array.isArray(entry)) damaged();
    const [childName, colour] = entry;
    if (!isName(childName) || !isHexColour(colour)) damaged();
    return { name: childName, colour };
  });

  const carers = compact.k.map((entry) => {
    if (!Array.isArray(entry)) damaged();
    const [carerName, shortName, type, cost] = entry;
    if (!isName(carerName) || !isName(shortName) || !isCarerType(type) || !isOptionalCost(cost)) damaged();
    return { name: carerName, short_name: shortName, type, cost_per_day: cost ?? null };
  });

  const assignments = compact.a
    .map((entry) => {
      if (!Array.isArray(entry)) damaged();
      // Trailing nulls are trimmed when encoding, so these may arrive undefined.
      const [child, carer, offset, period = null, startTime = null, endTime = null, notes = null, cost = null] = entry;
      if (!isWholeNumber(child) || !isWholeNumber(carer) || !isOffset(offset)) damaged();
      const shapeOk =
        period === null
          ? isTimeRange(startTime, endTime)
          : isSlotPeriod(period) && startTime === null && endTime === null;
      if (!shapeOk || !isOptionalText(notes) || !isOptionalCost(cost)) damaged();
      return {
        childIndex: child,
        carerIndex: carer,
        date: addDays(startDate, offset),
        period,
        start_time: startTime,
        end_time: endTime,
        notes,
        cost,
      };
    })
    // Guard against a damaged code pointing at someone who is not there.
    .filter((item) => item.childIndex >= 0 && item.childIndex < children.length && item.carerIndex >= 0 && item.carerIndex < carers.length);

  const dayNotes = (compact.n ?? []).map((entry) => {
    if (!Array.isArray(entry)) damaged();
    const [offset, note] = entry;
    if (!isOffset(offset) || typeof note !== 'string' || note.length > MAX_TEXT_LENGTH) damaged();
    return { date: addDays(startDate, offset), note };
  });

  return {
    holiday: {
      name,
      start_date: startDate,
      end_date: endDate,
      mode,
      exclude_weekends: excludeWeekends,
    },
    children,
    carers,
    assignments,
    dayNotes,
  };
}
