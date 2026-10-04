import type { HolidayCoverage } from '../db/coverage';
import type { Holiday } from '../db/types';
import { daysBetween } from './dates';

/**
 * How far off the next break is.
 *
 * `now` covers a holiday already under way — the parent does not want a
 * countdown to something they are currently living through.
 */
export type NextBreak = { kind: 'none' } | { kind: 'now' } | { kind: 'days'; days: number };

export function nextBreak(today: string, holiday: Holiday | null): NextBreak {
  if (!holiday) return { kind: 'none' };
  if (holiday.start_date <= today) return { kind: 'now' };
  return { kind: 'days', days: daysBetween(today, holiday.start_date) };
}

/** Stat-card text for the next break. */
export function formatNextBreak(next: NextBreak): string {
  switch (next.kind) {
    case 'none':
      return '—';
    case 'now':
      return 'Now';
    case 'days':
      return next.days === 1 ? '1 day' : `${next.days} days`;
  }
}

/**
 * Holiday card summary: "Not started yet", "All days complete", or
 * "3 days incomplete · 7 complete". A day is complete only when every child
 * is covered all day, so a day with some cover booked still counts as
 * incomplete — the progress bar shows those part-planned days in amber.
 */
export function coverageSummary(coverage: HolidayCoverage): string {
  if (coverage.empty) return 'Not started yet';
  if (coverage.gapDays === 0) return 'All days complete';
  const incomplete = `${plural(coverage.gapDays, 'day', 'days')} incomplete`;
  return coverage.coveredDays > 0 ? `${incomplete} · ${coverage.coveredDays} complete` : incomplete;
}

/** "3 days" / "1 day", for the gaps stat card. */
export function formatGapCount(slots: number): string {
  return slots === 1 ? '1 slot' : `${slots} slots`;
}

/**
 * Longest short name that fits a weekly grid cell with five days across a
 * phone (measured at 360px wide, the narrowest common Android width).
 */
export const MAX_SHORT_NAME = 7;

/** Longest carer name: fits the two-across carer picker without cutting off. */
export const MAX_CARER_NAME = 20;

/**
 * Suggest a grid-sized short name from a full one.
 *
 * Prefers the first word when it fits on its own — "Holiday club" reads better
 * as "Holiday" than as a hard "Holiday c" truncation.
 */
export function suggestShortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= MAX_SHORT_NAME) return trimmed;

  const firstWord = trimmed.split(/\s+/)[0];
  if (firstWord.length <= MAX_SHORT_NAME) return firstWord;
  return trimmed.slice(0, MAX_SHORT_NAME);
}

/** "£32.50/day", dropping a trailing ".00". */
export function formatCost(cost: number): string {
  return `£${cost.toFixed(2).replace(/\.00$/, '')}/day`;
}

/** "1 child" / "3 children" — count with a correctly inflected noun. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
