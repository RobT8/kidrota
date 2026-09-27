import { MAX_HOLIDAY_DAYS, type CarerType, type HolidayMode } from './constants';
import { daysBetween, getHolidayDates, parseISODate, toISODate } from './dates';
import { isTime } from './timeSlots';

/**
 * Checks for data arriving from outside the app — a backup file or a plan
 * code someone sent. Both are plain text a person could damage or edit, so
 * nothing from them is trusted until it has passed these.
 */

export const CARER_TYPES: readonly CarerType[] = ['parent', 'family', 'club', 'playdate', 'other'];
export const HOLIDAY_MODES: readonly HolidayMode[] = ['simple', 'detailed'];
/** The periods the app itself creates. */
export const SLOT_PERIODS = ['am', 'pm'] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

/** A real calendar day written YYYY-MM-DD — "2026-02-30" is not one. */
export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && toISODate(parseISODate(value)) === value;
}

/**
 * A six-digit hex colour. Anything else could reach a CSS `background`,
 * where a value like `url(…)` would make the app fetch a stranger's address.
 */
export function isHexColour(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOUR.test(value);
}

/** A name worth showing: a string with something in it, and not absurdly long. */
export function isName(value: unknown, maxLength = 100): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= maxLength;
}

export function isCarerType(value: unknown): value is CarerType {
  return CARER_TYPES.includes(value as CarerType);
}

export function isHolidayMode(value: unknown): value is HolidayMode {
  return HOLIDAY_MODES.includes(value as HolidayMode);
}

export function isSlotPeriod(value: unknown): value is (typeof SLOT_PERIODS)[number] {
  return SLOT_PERIODS.includes(value as (typeof SLOT_PERIODS)[number]);
}

/** A whole number, as SQLite ids and sort orders are. */
export function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/** A cost: absent, or a finite amount of zero or more. */
export function isOptionalCost(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

/**
 * Longest note accepted from outside. The app's own fields are far shorter
 * (a day note is 200 characters); this only refuses nonsense.
 */
export const MAX_TEXT_LENGTH = 10_000;

export function isOptionalText(value: unknown, maxLength = MAX_TEXT_LENGTH): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.length <= maxLength);
}

/** A detailed-mode session: two real times, ending after it starts. */
export function isTimeRange(start: unknown, end: unknown): boolean {
  return isTime(start as string) && isTime(end as string) && (end as string) > (start as string);
}

/** Calendar days in a holiday, first and last day included. */
export function holidayLength(start: string, end: string): number {
  return daysBetween(start, end) + 1;
}

/**
 * Why a holiday's dates cannot be saved, in the words the form shows, or null
 * if they are fine.
 */
export function holidayDatesProblem(start: string, end: string, excludeWeekends: boolean): string | null {
  if (end < start) return 'The end date is before the start date.';
  if (holidayLength(start, end) > MAX_HOLIDAY_DAYS) {
    return `A holiday can be up to ${MAX_HOLIDAY_DAYS / 7} weeks long. Split a longer stretch into two holidays.`;
  }
  if (getHolidayDates({ start_date: start, end_date: end, exclude_weekends: excludeWeekends ? 1 : 0 }).length === 0) {
    return 'That range is all weekend. Turn off “Weekdays only” to include it.';
  }
  return null;
}
